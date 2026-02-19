import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: org } = await supabase
    .from('organisations')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!org) redirect('/onboarding')

  const { data: audits } = await supabase
    .from('audits')
    .select('*, interviews(count), reports(id, tier)')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })

  const statusColor: Record<string, string> = {
    setup: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-600',
    analysing: 'bg-yellow-100 text-yellow-600',
    complete: 'bg-green-100 text-green-600',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔭</span>
            <div>
              <span className="font-bold text-teal-500">Linkgrow Lense</span>
              <span className="text-gray-400 text-sm ml-3">{org.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              <span className="font-semibold text-teal-600">{org.pack_credits_remaining}</span> interview credit{org.pack_credits_remaining !== 1 ? 's' : ''} remaining
            </span>
            <Link href="/checkout" className="btn-primary text-sm py-2 px-4">Buy credits</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Credits banner if low */}
        {org.pack_credits_remaining === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <span className="text-amber-700 font-medium">You have no interview credits remaining</span>
            <Link href="/checkout" className="btn-primary text-sm py-2 px-4">Buy a pack</Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="card text-center">
            <div className="text-3xl font-bold text-teal-500">{audits?.length ?? 0}</div>
            <div className="text-gray-500 text-sm mt-1">Total audits</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-teal-500">
              {audits?.reduce((sum, a) => sum + (a.interview_count_completed ?? 0), 0) ?? 0}
            </div>
            <div className="text-gray-500 text-sm mt-1">Interviews completed</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-teal-500">
              {audits?.filter(a => a.status === 'complete').length ?? 0}
            </div>
            <div className="text-gray-500 text-sm mt-1">Reports ready</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Your Audits</h2>
          <Link href="/onboarding" className="btn-primary text-sm py-2 px-4">
            + New Audit
          </Link>
        </div>

        {/* Audits list */}
        {audits && audits.length > 0 ? (
          <div className="space-y-4">
            {audits.map(audit => (
              <div key={audit.id} className="card flex items-center justify-between">
                <div>
                  <div className="font-semibold">{audit.title}</div>
                  {audit.department && <div className="text-sm text-gray-500">{audit.department}</div>}
                  <div className="text-xs text-gray-400 mt-1">
                    {audit.interview_count_completed}/{audit.interview_count_planned} interviews complete
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusColor[audit.status] ?? statusColor.setup}`}>
                    {audit.status.replace('_', ' ')}
                  </span>
                  {audit.reports && audit.reports.length > 0 ? (
                    <Link href={`/report/${audit.reports[0].id}`} className="btn-primary text-sm py-2 px-4">
                      View Report
                    </Link>
                  ) : (
                    <span className="text-sm text-gray-400">Report generating...</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-16">
            <span className="text-5xl block mb-4">🎯</span>
            <h3 className="font-bold text-xl mb-2">Run your first audit</h3>
            <p className="text-gray-500 mb-6">Brief the AI on your organisation and schedule your first interview</p>
            <Link href="/onboarding" className="btn-primary">Start free audit →</Link>
          </div>
        )}
      </main>
    </div>
  )
}
