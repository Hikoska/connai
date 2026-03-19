'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useScrollReveal } from '@/lib/useScrollReveal';

export function SocialProof() {
  const [stats, setStats] = useState({
    completedSessions: 0,
    distinctOrganisations: 0,
  });

  const sectionRef = useScrollReveal<HTMLDivElement>({ threshold: 0.2 })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const supabase = createClient();
        // Join leads table to filter out synthetic QA entries (Overnight_*, Test*)
        const { data } = await supabase
          .from('interviews')
          .select('id, leads!inner(org_name)')
          .not('leads.org_name', 'like', 'Overnight_%')
          .not('leads.org_name', 'like', 'Test%');
        if (data) {
          const organisations = data
            .map((item) => (item.leads as unknown as { org_name: string } | null)?.org_name)
            .filter((name): name is string => Boolean(name));
          setStats({
            completedSessions: data.length,
            distinctOrganisations: Array.from(new Set(organisations)).length,
          });
        }
      } catch (err) {
        // fail silently — counter stays at 0 and component renders null
      }
    };
    fetchStats();
  }, []);

  if (stats.completedSessions === 0) return null;

  return (
    <section className="py-12 bg-white">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div ref={sectionRef} className="scroll-stagger flex flex-col sm:flex-row justify-center gap-12">
          <div>
            <p className="text-5xl font-bold text-[#0D5C63]">{stats.completedSessions}</p>
            <p className="text-gray-600 mt-2">Assessments completed</p>
          </div>
          <div>
            <p className="text-5xl font-bold text-[#0D5C63]">{stats.distinctOrganisations}</p>
            <p className="text-gray-600 mt-2">Organisations audited</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SocialProof;
