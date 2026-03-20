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
        // Count only completed interviews, exclude synthetic QA entries
        const { data } = await supabase
          .from('interviews')
          .select('id, leads!inner(org_name)')
          .eq('status', 'complete')
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
      } catch {
        // fail silently — counter stays at 0 and component renders null
      }
    };
    fetchStats();
  }, []);

  if (stats.completedSessions === 0) return null;

  return (
    <div ref={sectionRef} className="scroll-stagger flex flex-col sm:flex-row justify-center gap-12 mt-4">
      <div>
        <p className="text-4xl font-bold text-teal-400">{stats.completedSessions}</p>
        <p className="text-white/60 text-sm mt-1">Assessments completed</p>
      </div>
      <div>
        <p className="text-4xl font-bold text-teal-400">{stats.distinctOrganisations}</p>
        <p className="text-white/60 text-sm mt-1">Organisations audited</p>
      </div>
    </div>
  );
}

export default SocialProof;
