'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const DEPARTMENTS = ['IT', 'Finance', 'HR', 'Operations', 'Sales', 'Marketing', 'Executive', 'Other']

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [auditTitle, setAuditTitle] = useState('Digital Maturity Audit 2026')
  const [department, setDepartment] = useState('')
  const [context, setContext] = useState('')
  const [interviewees, setInterviewees] = useState([{ name: '', email: '', role: '', department: '' }])

  const addInterviewee = () => {
    setInterviewees([...interviewees, { name: '', email: '', role: '', department: '' }])
  }

  const updateInterviewee = (index: number, field: string, value: string) => {
    const updated = [...interviewees]
    updated[index] = { ...updated[index], [field]: value }
    setInterviewees(updated)
  }

  const handleSubmit = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: org } = await supabase
      .from('organisations')
      .select('id, pack_credits_remaining')
      .eq('owner_id', user.id)
      .single()

    if (!org || org.pack_credits_remaining < interviewees.length) {
      alert('Not enough interview credits. Please purchase a pack.')
      router.push('/checkout')
      return
    }

    // Create audit
    const { data: audit } = await supabase
      .from('audits')
      .insert({
        org_id: org.id,
        title: auditTitle,
        department,
        context,
        status: 'in_progress',
        interview_count_planned: interviewees.length,
      })
      .select()
      .single()

    if (!audit) { setLoading(false); return }

    // Create interviews
    const interviewInserts = interviewees
      .filter(i => i.email)
      .map(i => ({
        audit_id: audit.id,
        org_id: org.id,
        subject_email: i.email,
        subject_name: i.name,
        subject_role: i.role,
        subject_department: i.department || department,
        status: 'scheduled',
      }))

    await supabase.from('interviews').insert(interviewInserts)

    // Deduct credits
    await supabase
      .from('organisations')
      .update({ pack_credits_remaining: org.pack_credits_remaining - interviewInserts.length })
      .eq('id', org.id)

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-teal-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-4xl">🔭</span>
          <h1 className="text-2xl font-bold mt-2">Set up your audit</h1>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-8 h-2 rounded-full ${step >= s ? 'bg-teal-500' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        <div className="card">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Audit details</h2>
              <div>
                <label className="block text-sm font-medium mb-1">Audit title</label>
                <input value={auditTitle} onChange={e => setAuditTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-300" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Primary department (optional)</label>
                <select value={department} onChange={e => setDepartment(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-300">
                  <option value="">Whole organisation</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <button onClick={() => setStep(2)} className="btn-primary w-full">Next →</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Brief the AI</h2>
              <p className="text-gray-500 text-sm">Give context about your organisation — industry, size, current challenges, what you hope to learn. The AI uses this to ask smarter questions.</p>
              <textarea value={context} onChange={e => setContext(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 h-40 resize-none focus:outline-none focus:ring-2 focus:ring-teal-300"
                placeholder="e.g. We are a 200-person wholesale company in Mauritius. We recently suffered a ransomware attack and are now undertaking a digital transformation to modernise our systems. Key concerns: data security, process digitalisation, staff adoption of new tools..." />
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
                <button onClick={() => setStep(3)} className="btn-primary flex-1">Next →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Add interviewees</h2>
              <p className="text-gray-500 text-sm">Each person will receive a unique interview link via email. They can complete it at their own pace.</p>
              {interviewees.map((person, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-medium text-gray-500">Person {i + 1}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={person.name} onChange={e => updateInterviewee(i, 'name', e.target.value)}
                      placeholder="Full name" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                    <input value={person.role} onChange={e => updateInterviewee(i, 'role', e.target.value)}
                      placeholder="Job title" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                    <input type="email" value={person.email} onChange={e => updateInterviewee(i, 'email', e.target.value)}
                      placeholder="Email address *" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" required />
                    <select value={person.department} onChange={e => updateInterviewee(i, 'department', e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
                      <option value="">Department</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              ))}
              <button onClick={addInterviewee} className="btn-secondary w-full text-sm">+ Add another person</button>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1">← Back</button>
                <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Scheduling...' : 'Schedule interviews →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
