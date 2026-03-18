'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export const FeedbackWidget = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState('feedback')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [isPending, startTransition] = useTransition()
  const [formState, setFormState] = useState<{ success: boolean; message: string } | null>(null)

  // A11y: focus management refs
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const toggleBtnRef = useRef<HTMLButtonElement>(null)

  const toggleOpen = () => setIsOpen(prev => !prev)

  // A11y: move focus to close button when panel opens; restore to toggle when it closes
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => closeBtnRef.current?.focus(), 20)
    } else {
      // Only restore focus if the panel was previously open (not on first render)
      if (formState !== null || message || email) {
        toggleBtnRef.current?.focus()
      }
    }
  }, [isOpen])

  // A11y: focus trap + Escape key handler
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        return
      }
      if (e.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return

      const focusable = panel.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!message) return;

    startTransition(async () => {
      try {
        const supabase = createClient()
        const { error } = await supabase.from('feedback').insert({
          type: feedbackType,
          message,
          email: email || null,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
          status: 'new',
        });

        if (error) {
          throw new Error(error.message)
        }

        setFormState({ success: true, message: 'Thank you for your feedback!' })
        setMessage('')
        setEmail('')
        setTimeout(() => setIsOpen(false), 2000);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setFormState({ success: false, message: `Submission failed: ${errorMessage}` })
      }
    })
  }

  const panelId = 'feedback-panel'

  return (
    <>
      {/* A11y: aria-expanded + aria-controls + aria-haspopup describe toggle button */}
      <button
        ref={toggleBtnRef}
        type="button"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-label={isOpen ? 'Close feedback panel' : 'Open feedback panel'}
        className="fixed bottom-20 right-4 bg-teal-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-teal-700 transition-colors z-50 font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
      >
        Feedback
      </button>

      {/* A11y: role="dialog" + aria-modal + aria-label for the feedback panel */}
      {isOpen && (
        <div
          id={panelId}
          ref={panelRef}
          className="fixed bottom-36 right-4 w-80 bg-white rounded-lg shadow-2xl z-50 border"
          role="dialog"
          aria-modal="true"
          aria-label="Submit feedback"
        >
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-bold" id="feedback-panel-title">Submit Feedback</h3>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={toggleOpen}
              className="font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
              aria-label="Close feedback"
            >&times;</button>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-4" aria-labelledby="feedback-panel-title">
            <fieldset>
              <legend className="sr-only">Feedback type</legend>
              <div className="flex justify-around">
                {['feedback', 'bug', 'suggestion'].map(type => (
                  <label key={type} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="feedbackType"
                      value={type}
                      checked={feedbackType === type}
                      onChange={(e) => setFeedbackType(e.target.value)}
                      className="form-radio text-teal-600"
                    />
                    <span className="capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              {/* A11y: explicit label for textarea */}
              <label htmlFor="feedback-message" className="sr-only">Your feedback message</label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your message..."
                required
                aria-required="true"
                className="w-full p-2 border rounded-md text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                rows={4}
              />
            </div>
            <div>
              {/* A11y: explicit label for email input */}
              <label htmlFor="feedback-email" className="sr-only">Email address (optional)</label>
              <input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional)"
                aria-label="Email address (optional)"
                className="w-full p-2 border rounded-md text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              aria-busy={isPending}
              className="w-full bg-teal-600 text-white font-bold py-2 rounded-md hover:bg-teal-700 disabled:bg-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              {isPending ? 'Submitting...' : 'Submit'}
            </button>
            {/* A11y: role="alert" for errors (immediate), role="status" for success (polite) */}
            {formState && (
              <p
                role={formState.success ? 'status' : 'alert'}
                aria-live={formState.success ? 'polite' : 'assertive'}
                className={`text-sm ${formState.success ? 'text-green-600' : 'text-red-600'}`}
              >
                {formState.message}
              </p>
            )}
          </form>
        </div>
      )}
    </>
  )
}
