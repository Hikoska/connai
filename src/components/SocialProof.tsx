'use client'

import { useEffect, useRef, useState } from 'react'
import CountUp from 'react-countup'

interface LiveStats {
  interviews: number
  organisations: number
  avgScore: number
}

const FALLBACK: LiveStats = { interviews: 12, organisations: 8, avgScore: 71 }

const researchStats = [
  { value: 70, unit: '%', label: 'Faster decisions', source: 'McKinsey' },
  { value: 17, unit: '%', label: 'Higher profitability', source: 'McKinsey' },
  { value: 215, unit: '%', label: 'Higher revenue growth', source: 'Gartner' },
]

export const SocialProof = () => {
  const [stats, setStats] = useState<LiveStats>(FALLBACK)
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Scroll-into-view trigger (native IntersectionObserver — no extra dep)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  // Fetch live Supabase counts
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (!url || !key) return

        const h = {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        }

        const [sessRes, scoreRes] = await Promise.all([
          fetch(`${url}/rest/v1/interview_sessions?select=id,organisation`, { headers: h }),
          fetch(`${url}/rest/v1/reports?select=score`, { headers: h }),
        ])

        const sessions = await sessRes.json()
        const reports  = await scoreRes.json()

        if (!Array.isArray(sessions)) return

        const interviews    = sessions.length
        const organisations = new Set(
          sessions.map((s: any) => (s.organisation ?? '').toLowerCase().trim()).filter(Boolean)
        ).size

        const scores  = reports.filter((r: any) => typeof r.score === 'number').map((r: any) => r.score)
        const avgScore = scores.length > 0
          ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
          : FALLBACK.avgScore

        setStats({
          interviews:    interviews    || FALLBACK.interviews,
          organisations: organisations || FALLBACK.organisations,
          avgScore,
        })
      } catch {
        // Silently fall back to static values
      }
    }

    fetchStats()
  }, [])

  return (
    <section className="bg-[#0E1117] text-white py-12">
      <div className="max-w-6xl mx-auto px-4 space-y-10">

        {/* Live Connai platform stats */}
        <div ref={ref} className="grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl md:text-5xl font-mono font-bold text-teal-400">
              {inView ? <CountUp end={stats.interviews} duration={2} /> : 0}+
            </div>
            <p className="text-gray-400 mt-2 text-sm">Assessments completed</p>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-mono font-bold text-teal-400">
              {inView ? <CountUp end={stats.organisations} duration={2} /> : 0}
            </div>
            <p className="text-gray-400 mt-2 text-sm">Organisations audited</p>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-mono font-bold text-teal-400">
              {inView ? <CountUp end={stats.avgScore} duration={2} /> : 0}%
            </div>
            <p className="text-gray-400 mt-2 text-sm">Avg. digital maturity score</p>
          </div>
        </div>

        {/* Research-backed industry benchmarks */}
        <div className="border-t border-white/10 pt-8 grid grid-cols-3 gap-8 text-center">
          {researchStats.map((stat, i) => (
            <div key={i}>
              <div className="text-3xl md:text-4xl font-mono font-bold text-white/50">
                {stat.value}{stat.unit}
              </div>
              <p className="text-gray-500 mt-2 text-xs">{stat.label} · {stat.source}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
