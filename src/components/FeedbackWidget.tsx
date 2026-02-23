'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const FeedbackWidget = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState('feedback')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [isPending, startTransition] = useTransition()
  const [formState, setFormState] = useState<{ success: boolean; message: string } | null>(null)

  const toggleOpen = () => setIsOpen(!isOpen)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!message) return;

    startTransition(async () => {
        try {
            const supabase = createClient(supabaseUrl, supabaseAnonKey)
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

  return (
    <>
      <button 
        onClick={toggleOpen}
        className="fixed bottom-4 right-4 bg-teal-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-teal-700 transition-colors z-50 font-semibold"
      >
        Feedback
      </button>

      {isOpen && (
        <div className="fixed bottom-16 right-4 w-80 bg-white rounded-lg shadow-2xl z-50 border">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-bold">Submit Feedback</h3>
            <button onClick={toggleOpen} className="font-bold">&times;</button>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
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
            </div>
            <div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your message..."
                required
                className="w-full p-2 border rounded-md text-sm"
                rows={4}
              />
            </div>
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional)"
                className="w-full p-2 border rounded-md text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-teal-600 text-white font-bold py-2 rounded-md hover:bg-teal-700 disabled:bg-gray-400"
            >
              {isPending ? 'Submitting...' : 'Submit'}
            </button>
            {formState && (
              <p className={`text-sm ${formState.success ? 'text-green-600' : 'text-red-600'}`}>
                {formState.message}
              </p>
            )}
          </form>
        </div>
      )}
    </>
  )
}
