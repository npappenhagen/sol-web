import { useState, useEffect, useRef, useCallback } from 'react'

interface ResizeConstraints {
  minW: number
  minH: number
  maxW: number
  maxHVh: number // Max height as viewport percentage
}

interface UseResizableResult {
  size: { w: number, h: number }
  handleResizeStart: (e: React.MouseEvent | React.TouchEvent) => void
  resetSize: () => void
}

const DEFAULT_CONSTRAINTS: ResizeConstraints = {
  minW: 320,
  minH: 380,
  maxW: 520,
  maxHVh: 85,
}

/**
 * Hook for making an element resizable via drag.
 */
export function useResizable(
  defaultSize: { w: number, h: number },
  constraints: Partial<ResizeConstraints> = {},
): UseResizableResult {
  const { minW, minH, maxW, maxHVh } = { ...DEFAULT_CONSTRAINTS, ...constraints }

  const [size, setSize] = useState(defaultSize)
  const isResizing = useRef(false)
  const startRef = useRef({ x: 0, y: 0, w: 0, h: 0 })

  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isResizing.current = true
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    startRef.current = { x: clientX, y: clientY, w: size.w, h: size.h }
  }, [size])

  useEffect(() => {
    const move = (e: MouseEvent | TouchEvent) => {
      if (!isResizing.current) return
      e.preventDefault()
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY
      const dx = clientX - startRef.current.x
      const dy = clientY - startRef.current.y
      const maxH = Math.min(window.innerHeight * (maxHVh / 100), 700)
      setSize({
        w: Math.min(maxW, Math.max(minW, startRef.current.w + dx)),
        h: Math.min(maxH, Math.max(minH, startRef.current.h + dy)),
      })
    }
    const up = () => { isResizing.current = false }

    document.addEventListener('mousemove', move)
    document.addEventListener('touchmove', move, { passive: false })
    document.addEventListener('mouseup', up)
    document.addEventListener('touchend', up)

    return () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('touchmove', move)
      document.removeEventListener('mouseup', up)
      document.removeEventListener('touchend', up)
    }
  }, [minW, minH, maxW, maxHVh])

  const resetSize = useCallback(() => {
    setSize(defaultSize)
  }, [defaultSize])

  return { size, handleResizeStart, resetSize }
}
