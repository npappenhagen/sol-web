/**
 * Progressive image pool with sessionStorage-based state management.
 *
 * Tracks which images have been shown and preloaded to enable:
 * - Variety: Avoid repeating recently shown images
 * - Speed: Prefer images that were preloaded during idle time
 * - Session spread: Prevent images from the same photo shoot appearing adjacent
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
 * Generate minified inline JS for session-aware pool selection.
 * This runs BEFORE React hydration to prevent flash.
 *
 * Session-aware algorithm:
 * 1. Groups images by session (date_taken)
 * 2. Shuffles within each session group
 * 3. Round-robin picks from each session (prevents same-shoot adjacency)
 * 4. Updates sessionStorage.shown
 * 5. Preloads first image for LCP
 */
export function generatePoolSelectionScript(poolId: string, count: number, pageId: string): string {
  return `
(function(){
  var K='sol-image-pool',M=20,PID='${poolId}',N=${count},PAGE='${pageId}';
  var DBG=localStorage.getItem('HERO_DEBUG')==='true';
  var DBG_START=performance.now();
  var DBG_EVENTS=[];
  function dlog(e,d){
    if(!DBG)return;
    var ev={ts:Math.round(performance.now()-DBG_START),event:'inline_'+e};
    if(d)ev.data=d;
    DBG_EVENTS.push(ev);
    console.log('%c[HeroInline +'+ev.ts+'ms]%c '+e,'color:#ff0','color:#fff',d||'');
    try{
      var ex=JSON.parse(localStorage.getItem('HERO_DEBUG_LOG')||'{"events":[]}');
      ex.events=ex.events.concat(DBG_EVENTS);
      localStorage.setItem('HERO_DEBUG_LOG',JSON.stringify(ex));
    }catch(x){}
  }
  dlog('script_start',{poolId:PID,count:N,pageId:PAGE});
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
  function runSelection(){
    dlog('runSelection_called');
    var el=document.getElementById(PID);
    if(!el){dlog('pool_element_not_found');return;}
    try{
      var pool=JSON.parse(el.textContent||'[]');
      dlog('pool_parsed',{poolSize:pool.length});
      if(pool.length<=N){
        window.__heroSelection=pool;
        window.__heroPageId=PAGE;
        dlog('pool_small_using_all',{count:pool.length});
        return;
      }
      var st=gs();
      var shown=new Set(st.shown);
      // Group by session (date_taken) - images without session get unique keys
      var sess={},uc=0;
      pool.forEach(function(img){
        var k=img.session||('u'+uc++);
        if(!sess[k])sess[k]=[];
        sess[k].push(img);
      });
      // Shuffle each session array
      Object.keys(sess).forEach(function(k){
        var arr=sess[k];
        for(var i=arr.length-1;i>0;i--){
          var j=Math.floor(Math.random()*(i+1));
          var t=arr[i];arr[i]=arr[j];arr[j]=t;
        }
      });
      // Penalize recently shown images by moving to end of session array
      Object.keys(sess).forEach(function(k){
        var arr=sess[k];
        var notShown=[],wasShown=[];
        arr.forEach(function(img){
          if(shown.has(img.src))wasShown.push(img);
          else notShown.push(img);
        });
        sess[k]=notShown.concat(wasShown);
      });
      // Round-robin select from sessions
      var keys=Object.keys(sess);
      var sel=[],idx=Math.floor(Math.random()*keys.length);
      while(sel.length<N&&keys.some(function(k){return sess[k].length>0;})){
        var k=keys[idx%keys.length];
        if(sess[k].length>0)sel.push(sess[k].shift());
        idx++;
      }
      window.__heroSelection=sel;
      dlog('selection_complete',{
        count:sel.length,
        images:sel.map(function(x){return x.src.split('/').pop();})
      });
      us({shown:st.shown.concat(sel.map(function(x){return x.src;})).slice(-M)});
      if(sel.length>0){
        var link=document.createElement('link');
        link.rel='preload';link.as='image';link.href=sel[0].src;
        document.head.appendChild(link);
        dlog('preload_added',{src:sel[0].src.split('/').pop()});
      }
    }catch(e){
      dlog('selection_error',{error:e.message});
      console.warn('Hero pool selection failed:',e);
      window.__heroSelection=pool.slice(0,N);
    }
    window.__heroPageId=PAGE;
    dlog('window_set',{heroPageId:PAGE,selectionCount:window.__heroSelection?window.__heroSelection.length:0});
  }
  // Track if we've already selected for this page to avoid re-selection on astro:page-load
  var hasSelected=false;
  // Run on initial load
  runSelection();
  hasSelected=true;
  // Re-run on View Transitions navigation (only if URL changed)
  var lastUrl=window.location.href;
  document.addEventListener('astro:page-load',function(){
    var newUrl=window.location.href;
    dlog('astro_page_load_triggered',{lastUrl:lastUrl,newUrl:newUrl,hasSelected:hasSelected});
    if(newUrl!==lastUrl){
      dlog('url_changed_reselecting');
      lastUrl=newUrl;
      hasSelected=false;
      runSelection();
      hasSelected=true;
    }else{
      dlog('same_url_skipping_reselection');
    }
  });
})();
`.trim()
}
