import { useState, useEffect, useRef, useCallback } from 'react'
import { Mail, CheckCircle2, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { getStarterMessage, getPlaceholder } from '@/lib/inquiry-messages'

type Status = 'idle' | 'sending' | 'sent' | 'error'

interface FormData {
  message: string
  email: string
  name: string
}

interface FormErrors {
  message?: string
  email?: string
}

interface TouchedFields {
  message: boolean
  email: boolean
}

const MIN_W = 320
const MIN_H = 380
const MAX_W = 520
const MAX_H = 85 // vh
const DEFAULT_W = 400
const DEFAULT_H = 520

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

function validateEmail(email: string): string | undefined {
  const trimmed = email.trim()
  if (!trimmed) return 'Email is required'
  if (!EMAIL_REGEX.test(trimmed)) return 'Please enter a valid email address'
  return undefined
}

function validateMessage(message: string): string | undefined {
  const trimmed = message.trim()
  if (!trimmed) return 'Please include a message'
  if (trimmed.length < 10) return 'Message is too short'
  return undefined
}

function validateForm(data: FormData): FormErrors {
  return {
    message: validateMessage(data.message),
    email: validateEmail(data.email),
  }
}

const baseFieldClass =
  'border bg-[var(--sol-cream)] text-[var(--sol-charcoal)] placeholder:text-[var(--sol-charcoal)]/40 font-serif transition-colors'
const validFieldClass = 'border-[var(--sol-sage)]/60 focus-visible:border-[var(--sol-caramel)]/70 focus-visible:ring-[var(--sol-caramel)]/20'
const errorFieldClass = 'border-[var(--sol-blush)] focus-visible:border-[var(--sol-blush)] focus-visible:ring-[var(--sol-blush)]/20'

export default function InquiryWidget() {
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [serverError, setServerError] = useState('')
  const [formData, setFormData] = useState<FormData>({ message: '', email: '', name: '' })
  const [touched, setTouched] = useState<TouchedFields>({ message: false, email: false })
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H })
  const [placeholder, setPlaceholder] = useState(() => getPlaceholder(null))

  const containerRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)
  const startRef = useRef({ x: 0, y: 0, w: 0, h: 0 })
  const formRef = useRef<HTMLFormElement>(null)

  // Compute errors based on current form data
  const errors = validateForm(formData)

  // Only show errors for touched fields
  const visibleErrors = {
    message: touched.message ? errors.message : undefined,
    email: touched.email ? errors.email : undefined,
  }

  const updateField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const markTouched = useCallback((field: keyof TouchedFields) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }, [])

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
      const maxH = Math.min(window.innerHeight * (MAX_H / 100), 700)
      setSize({
        w: Math.min(MAX_W, Math.max(MIN_W, startRef.current.w + dx)),
        h: Math.min(maxH, Math.max(MIN_H, startRef.current.h + dy)),
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
  }, [])

  // Parse context from hash (e.g., #inquiry?context=portraits)
  const parseInquiryHash = useCallback((hash: string): string | null => {
    if (!hash.includes('inquiry')) return null
    const queryStart = hash.indexOf('?')
    if (queryStart === -1) return null
    const params = new URLSearchParams(hash.slice(queryStart + 1))
    return params.get('context')
  }, [])

  // Open widget with optional context-aware starter message and placeholder
  const openWithContext = useCallback((context: string | null) => {
    const starter = getStarterMessage(context)
    if (starter) {
      setFormData(prev => ({ ...prev, message: starter }))
    }
    setPlaceholder(getPlaceholder(context))
    setExpanded(true)
  }, [])

  useEffect(() => {
    const checkHash = () => {
      if (typeof window === 'undefined') return
      const hash = window.location.hash
      if (hash.includes('inquiry')) {
        const context = parseInquiryHash(hash)
        openWithContext(context)
        window.history.replaceState(null, '', window.location.pathname)
      }
    }
    checkHash()
    window.addEventListener('hashchange', checkHash)

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href*="#inquiry"]') as HTMLAnchorElement | null
      if (link) {
        e.preventDefault()
        const href = link.getAttribute('href') || ''
        const hashIndex = href.indexOf('#')
        const hash = hashIndex !== -1 ? href.slice(hashIndex) : ''
        const context = parseInquiryHash(hash)
        openWithContext(context)
      }
    }
    document.addEventListener('click', handleClick)

    return () => {
      window.removeEventListener('hashchange', checkHash)
      document.removeEventListener('click', handleClick)
    }
  }, [parseInquiryHash, openWithContext])

  const resetForm = useCallback(() => {
    setFormData({ message: '', email: '', name: '' })
    setTouched({ message: false, email: false })
    setServerError('')
    setSize({ w: DEFAULT_W, h: DEFAULT_H })
  }, [])

  const close = useCallback(() => {
    setExpanded(false)
    setTimeout(() => {
      setStatus('idle')
      resetForm()
    }, 300)
  }, [resetForm])

  useEffect(() => {
    if (!expanded) return
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (containerRef.current?.contains(target)) return
      setTimeout(close, 0)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [expanded, close])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // Mark all fields as touched to show any validation errors
    setTouched({ message: true, email: true })

    // Check for validation errors
    const currentErrors = validateForm(formData)
    if (currentErrors.message || currentErrors.email) {
      return
    }

    setStatus('sending')
    setServerError('')

    try {
      const submitData = new FormData()
      submitData.append('message', formData.message.trim())
      submitData.append('email', formData.email.trim())
      if (formData.name.trim()) {
        submitData.append('name', formData.name.trim())
      }

      const res = await fetch('/api/contact', {
        method: 'POST',
        body: submitData,
      })
      const body = await res.json()

      if (res.ok) {
        setStatus('sent')
        resetForm()
      } else {
        setServerError(body.error ?? 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch {
      setServerError('Unable to send message. Please check your connection and try again.')
      setStatus('error')
    }
  }

  return (
    <div
      ref={containerRef}
      id="inquiry"
      className="fixed bottom-4 right-4 left-4 z-40 flex flex-col items-end gap-0 sm:left-auto sm:bottom-6 sm:right-6 pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]"
    >
      {/* Expanded panel */}
      <div
        id="inquiry-form"
        role="dialog"
        aria-label="Send a message"
        aria-hidden={!expanded}
        style={expanded ? { width: size.w, height: size.h, minHeight: MIN_H, maxWidth: '100%' } : undefined}
        className={cn(
          'overflow-hidden rounded-2xl border border-[var(--sol-sage)]/50 bg-[var(--sol-cream)] shadow-2xl transition-all duration-300 ease-out',
          expanded ? 'visible w-full max-w-[min(100vw-2rem,520px)] opacity-100 sm:max-w-none inquiry-panel-expand' : 'invisible h-0 max-h-0 w-0 opacity-0'
        )}
      >
        <div className="relative flex h-full flex-col overflow-hidden p-4 sm:p-5 min-w-0">
          {/* Header */}
          <div className="mb-4 flex shrink-0 items-center justify-between">
            <h2 className="font-display text-xl font-light text-[var(--sol-charcoal)]">Say hello</h2>
            <button
              type="button"
              onClick={close}
              className="rounded-full p-1.5 text-[var(--sol-charcoal)]/60 hover:bg-[var(--sol-sage)]/30 hover:text-[var(--sol-charcoal)] transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {status === 'sent' ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-[var(--sol-forest)] mb-4 success-icon-animate" strokeWidth={1.5} />
              <p className="font-display text-xl font-light text-[var(--sol-forest)] animate-fade-in" style={{ animationDelay: '0.2s' }}>
                Message sent
              </p>
              <p className="mt-2 font-serif text-sm text-[var(--sol-charcoal)]/70 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                I'll get back to you soon.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={close}
                className="mt-6 font-sans text-xs tracking-widest uppercase text-[var(--sol-caramel)] hover:text-[var(--sol-charcoal)] animate-fade-in"
                style={{ animationDelay: '0.6s' }}
              >
                Close
              </Button>
            </div>
          ) : (
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto min-h-0"
              noValidate
            >
              {/* Server error */}
              {status === 'error' && serverError && (
                <div className="rounded-md bg-[var(--sol-blush)]/10 border border-[var(--sol-blush)]/30 px-3 py-2" role="alert">
                  <p className="text-sm font-sans text-[var(--sol-blush)]">
                    {serverError}
                  </p>
                </div>
              )}

              {/* Honeypot */}
              <input name="website" type="text" tabIndex={-1} className="hidden" autoComplete="off" />

              {/* Message field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="inquiry-message"
                  className="font-sans text-xs tracking-widest uppercase text-[var(--sol-charcoal)]"
                >
                  Your message
                </label>
                <Textarea
                  id="inquiry-message"
                  name="message"
                  value={formData.message}
                  onChange={(e) => updateField('message', e.target.value)}
                  onBlur={() => markTouched('message')}
                  placeholder={placeholder}
                  aria-invalid={Boolean(visibleErrors.message)}
                  aria-describedby={visibleErrors.message ? 'message-error' : undefined}
                  className={cn(
                    baseFieldClass,
                    'min-h-[9rem] resize-none rounded-xl',
                    visibleErrors.message ? errorFieldClass : validFieldClass
                  )}
                />
                {visibleErrors.message && (
                  <p id="message-error" className="text-xs font-sans text-[var(--sol-blush)]">
                    {visibleErrors.message}
                  </p>
                )}
              </div>

              {/* Contact fields */}
              <div className="space-y-3 border-t border-[var(--sol-sage)]/40 pt-4">
                <p className="font-sans text-xs tracking-widest uppercase text-[var(--sol-charcoal)]/70">
                  Your contact info
                </p>

                {/* Email field */}
                <div className="space-y-1.5">
                  <label htmlFor="inquiry-email" className="sr-only">
                    Email address (required)
                  </label>
                  <Input
                    id="inquiry-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    onBlur={() => markTouched('email')}
                    placeholder="Email address"
                    autoComplete="email"
                    aria-invalid={Boolean(visibleErrors.email)}
                    aria-describedby={visibleErrors.email ? 'email-error' : undefined}
                    className={cn(
                      baseFieldClass,
                      'rounded-xl',
                      visibleErrors.email ? errorFieldClass : validFieldClass
                    )}
                  />
                  {visibleErrors.email && (
                    <p id="email-error" className="text-xs font-sans text-[var(--sol-blush)]">
                      {visibleErrors.email}
                    </p>
                  )}
                </div>

                {/* Name field (optional) */}
                <div>
                  <label htmlFor="inquiry-name" className="sr-only">
                    Your name
                  </label>
                  <Input
                    id="inquiry-name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    className={cn(baseFieldClass, validFieldClass, 'rounded-xl')}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                {/* Primary CTA - Send message */}
                <motion.button
                  type="submit"
                  disabled={status === 'sending'}
                  className="
                    group relative inline-flex items-center gap-2
                    px-5 py-2.5 rounded-full
                    font-sans text-xs tracking-widest uppercase
                    bg-gradient-to-r from-[var(--sol-caramel)] via-[var(--sol-blush)] to-[var(--sol-caramel)]
                    bg-[length:200%_100%]
                    text-white
                    shadow-md shadow-[var(--sol-caramel)]/20
                    disabled:opacity-60 disabled:cursor-not-allowed
                    overflow-hidden
                  "
                  initial={{ backgroundPosition: '0% 50%' }}
                  whileHover={status !== 'sending' ? {
                    backgroundPosition: '100% 50%',
                    boxShadow: '0 8px 30px -8px rgba(139, 94, 60, 0.4)',
                  } : {}}
                  whileTap={status !== 'sending' ? { scale: 0.98 } : {}}
                  transition={{
                    backgroundPosition: { duration: 0.4, ease: 'easeInOut' },
                    boxShadow: { duration: 0.2 },
                    scale: { duration: 0.1 },
                  }}
                >
                  {/* Shimmer effect */}
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                  <Send className="h-3.5 w-3.5 relative z-10" strokeWidth={1.5} />
                  <span className="relative z-10">
                    {status === 'sending' ? 'Sending...' : 'Send message'}
                  </span>
                </motion.button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={close}
                  className="font-sans text-xs tracking-widest uppercase text-[var(--sol-charcoal)]/60 hover:text-[var(--sol-charcoal)]"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Resize handle */}
          {expanded && status !== 'sent' && (
            <div
              role="separator"
              aria-label="Drag to resize"
              title="Drag to resize"
              onMouseDown={handleResizeStart}
              onTouchStart={handleResizeStart}
              className="absolute bottom-0 right-0 h-8 w-8 cursor-se-resize flex items-end justify-end p-1.5 touch-none rounded-tl-xl bg-[var(--sol-sage)]/10 hover:bg-[var(--sol-sage)]/25 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--sol-charcoal)]/40">
                <path d="M15 9l6 6M9 15l6 6" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Collapsed pill - Premium floating CTA */}
      <AnimatePresence>
        {!expanded && (
          <motion.button
            type="button"
            onClick={() => openWithContext(null)}
            className="
              group relative flex items-center gap-2.5
              rounded-full
              px-5 py-3
              bg-gradient-to-r from-[var(--sol-caramel)] via-[var(--sol-blush)] to-[var(--sol-caramel)]
              bg-[length:200%_100%]
              text-white
              shadow-lg shadow-[var(--sol-caramel)]/30
              overflow-hidden
            "
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            whileHover={{
              y: -3,
              boxShadow: '0 12px 40px -10px rgba(139, 94, 60, 0.5)',
            }}
            whileTap={{ scale: 0.97 }}
            transition={{
              default: { duration: 0.3 },
              backgroundPosition: {
                duration: 8,
                ease: 'linear',
                repeat: Infinity,
              },
            }}
            aria-expanded={expanded}
            aria-controls="inquiry-form"
            aria-label="Say hello — send a message"
          >
            {/* Shimmer effect on hover */}
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />

            <Mail className="h-4 w-4 relative z-10" strokeWidth={1.5} />
            <span className="font-sans text-sm tracking-wider relative z-10">Say hello</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
