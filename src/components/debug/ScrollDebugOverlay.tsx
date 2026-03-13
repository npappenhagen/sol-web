import { useState, useEffect } from 'react'
import {
  isDebugEnabled,
  getDebugState,
  clearDebugData,
  exportDebugData,
} from '@/lib/scroll-debug'

/**
 * Visual debug overlay showing event counts for scroll jank diagnosis.
 * Only renders when ?debug=scroll is in the URL.
 */
export default function ScrollDebugOverlay() {
  const [state, setState] = useState<ReturnType<typeof getDebugState> | null>(null)
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isDebugEnabled()) return

    setVisible(true)

    // Poll for state updates
    const interval = setInterval(() => {
      setState(getDebugState())
    }, 500)

    return () => clearInterval(interval)
  }, [])

  if (!visible || !state) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportDebugData())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = exportDebugData()
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClear = () => {
    clearDebugData()
    setState(getDebugState())
  }

  // Group counts by type
  const resizeCounts = Object.entries(state.counts)
    .filter(([key]) => key.startsWith('resize:'))
    .sort((a, b) => b[1] - a[1])

  const viewportChanges = state.counts['viewport_change:window'] || 0

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        color: '#fff',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        maxWidth: '280px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#6B9CAC' }}>
        Scroll Debug
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div>Viewport changes: <span style={{ color: viewportChanges > 5 ? '#ff6b6b' : '#4ecdc4' }}>{viewportChanges}</span></div>
      </div>

      {resizeCounts.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ color: '#888', marginBottom: '4px' }}>ResizeObserver:</div>
          {resizeCounts.map(([key, count]) => (
            <div key={key} style={{ paddingLeft: '8px' }}>
              {key.replace('resize:', '')}: <span style={{ color: count > 20 ? '#ff6b6b' : '#4ecdc4' }}>{count}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: '8px', color: '#888' }}>
        Total events: {state.events.length}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            backgroundColor: copied ? '#4ecdc4' : '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
        <button
          type="button"
          onClick={handleClear}
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            backgroundColor: '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>
    </div>
  )
}
