/**
 * Progressive image pool with sessionStorage-based state management.
 *
 * Tracks which images have been shown and preloaded to enable:
 * - Variety: Avoid repeating recently shown images
 * - Speed: Prefer images that were preloaded during idle time
 *
 * State resets when the browser tab closes (sessionStorage).
 */

const STORAGE_KEY = 'sol-image-pool'
const MAX_HISTORY = 20

export interface PoolState {
  shown: string[]      // Last N images displayed (FIFO)
  preloaded: string[]  // Images preloaded during idle
}

/**
 * Read pool state from sessionStorage.
 * Returns empty state if unavailable or corrupted.
 */
export function getPoolState(): PoolState {
  if (typeof sessionStorage === 'undefined') {
    return { shown: [], preloaded: [] }
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { shown: [], preloaded: [] }
    const parsed = JSON.parse(raw)
    return {
      shown: Array.isArray(parsed.shown) ? parsed.shown : [],
      preloaded: Array.isArray(parsed.preloaded) ? parsed.preloaded : [],
    }
  } catch {
    return { shown: [], preloaded: [] }
  }
}

/**
 * Update pool state in sessionStorage.
 * Silently fails if sessionStorage is unavailable.
 */
export function updatePoolState(partial: Partial<PoolState>): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    const current = getPoolState()
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...partial }))
  } catch {
    // sessionStorage unavailable or quota exceeded - graceful degradation
  }
}

/**
 * Score-based selection from an image pool.
 *
 * Scoring:
 * - +10 if preloaded (fast load from HTTP cache)
 * - -5 if recently shown (variety)
 * - +random(0-3) (some randomness)
 *
 * Returns top N images by score.
 */
export function selectFromPool(pool: string[], count: number): string[] {
  if (pool.length === 0) return []
  if (pool.length <= count) return pool

  const state = getPoolState()
  const shownSet = new Set(state.shown)
  const preloadedSet = new Set(state.preloaded)

  const scored = pool.map(src => ({
    src,
    score:
      (preloadedSet.has(src) ? 10 : 0) +
      (shownSet.has(src) ? -5 : 0) +
      Math.random() * 3,
  }))

  scored.sort((a, b) => b.score - a.score)
  const selected = scored.slice(0, count).map(s => s.src)

  // Update shown history (FIFO with max size)
  updatePoolState({
    shown: [...state.shown, ...selected].slice(-MAX_HISTORY),
  })

  return selected
}

/**
 * Generate minified inline JS for pool-aware selection.
 * This runs BEFORE React hydration to prevent flash.
 *
 * The inline script:
 * 1. Reads sessionStorage for shown/preloaded state
 * 2. Scores images: +10 preloaded, -5 recently shown, +random
 * 3. Selects top N by score
 * 4. Updates sessionStorage.shown
 * 5. Preloads first image for LCP
 */
export function generatePoolSelectionScript(poolId: string, count: number, pageId: string): string {
  return `
(function(){
  var K='sol-image-pool',M=20;
  function gs(){
    try{
      var r=sessionStorage.getItem(K);
      if(!r)return{shown:[],preloaded:[]};
      var p=JSON.parse(r);
      return{shown:Array.isArray(p.shown)?p.shown:[],preloaded:Array.isArray(p.preloaded)?p.preloaded:[]};
    }catch(e){return{shown:[],preloaded:[]};}
  }
  function us(s){
    try{var c=gs();sessionStorage.setItem(K,JSON.stringify(Object.assign(c,s)));}catch(e){}
  }
  var el=document.getElementById('${poolId}');
  if(!el)return;
  try{
    var pool=JSON.parse(el.textContent||'[]');
    var n=${count};
    if(pool.length<=n){window.__heroSelection=pool;window.__heroPageId='${pageId}';return;}
    var st=gs();
    var shown=new Set(st.shown);
    var pre=new Set(st.preloaded);
    var scored=pool.map(function(img){
      var s=img.src;
      return{img:img,score:(pre.has(s)?10:0)+(shown.has(s)?-5:0)+Math.random()*3};
    });
    scored.sort(function(a,b){return b.score-a.score;});
    var sel=scored.slice(0,n).map(function(x){return x.img;});
    window.__heroSelection=sel;
    window.__heroPageId='${pageId}';
    us({shown:st.shown.concat(sel.map(function(x){return x.src;})).slice(-M)});
    if(sel.length>0){
      var link=document.createElement('link');
      link.rel='preload';link.as='image';link.href=sel[0].src;
      document.head.appendChild(link);
    }
  }catch(e){console.warn('Hero pool selection failed:',e);}
})();
`.trim()
}
