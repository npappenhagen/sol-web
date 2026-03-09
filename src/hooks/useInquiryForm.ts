import { useState, useCallback } from 'react'
import { validateEmail, validateMessage } from '@/lib/validation'

export type Status = 'idle' | 'sending' | 'sent' | 'error'

export interface FormData {
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

interface UseInquiryFormResult {
  formData: FormData
  status: Status
  serverError: string
  errors: FormErrors
  visibleErrors: FormErrors
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  markTouched: (field: keyof TouchedFields) => void
  resetForm: () => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>
  setStatus: (status: Status) => void
}

function validateForm(data: FormData): FormErrors {
  return {
    message: validateMessage(data.message, { minLength: 10 }),
    email: validateEmail(data.email),
  }
}

/**
 * Hook for managing inquiry form state, validation, and submission.
 */
export function useInquiryForm(): UseInquiryFormResult {
  const [formData, setFormData] = useState<FormData>({ message: '', email: '', name: '' })
  const [touched, setTouched] = useState<TouchedFields>({ message: false, email: false })
  const [status, setStatus] = useState<Status>('idle')
  const [serverError, setServerError] = useState('')

  const errors = validateForm(formData)

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

  const resetForm = useCallback(() => {
    setFormData({ message: '', email: '', name: '' })
    setTouched({ message: false, email: false })
    setServerError('')
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
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
        setFormData({ message: '', email: '', name: '' })
        setTouched({ message: false, email: false })
      } else {
        setServerError(body.error ?? 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch {
      setServerError('Unable to send message. Please check your connection and try again.')
      setStatus('error')
    }
  }, [formData])

  return {
    formData,
    status,
    serverError,
    errors,
    visibleErrors,
    updateField,
    markTouched,
    resetForm,
    handleSubmit,
    setStatus,
  }
}
