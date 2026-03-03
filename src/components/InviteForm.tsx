'use client'

import { useState } from 'react'

export function InviteForm({ leadId, onInviteSent }: { leadId: string; onInviteSent: () => void }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/invites/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          stakeholders: [{ name, role, email: email.trim() || undefined }],
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add stakeholder')
      }

      setSuccess(email.trim() ? `Invite link sent to ${email.trim()}` : 'Stakeholder added')
      setName('')
      setRole('')
      setEmail('')
      onInviteSent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Stakeholder Name"
          required
          className="w-full bg-white/10 border border-white/20 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <input
          type="text"
          value={role}
          onChange={e => setRole(e.target.value)}
          placeholder="Role (e.g., CTO, Head of Ops)"
          required
          className="w-full bg-white/10 border border-white/20 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>
      <div>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email address (optional)"
          className="w-full bg-white/10 border border-white/20 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <p className="text-white/30 text-xs mt-1">Email is optional — you can copy the interview link manually instead.</p>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-teal-600 text-white font-semibold py-2 rounded-md hover:bg-teal-500 transition-colors disabled:opacity-50"
      >
        {loading ? 'Adding...' : 'Add stakeholder'}
      </button>
      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
      {success && <p className="text-teal-400 text-xs text-center">{success}</p>}
    </form>
  )
}
