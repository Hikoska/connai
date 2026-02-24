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
        const { data } = await supabase
          .from('interviews')
          .select('id, organisation', { count: 'exact' });
        if (data) {
          setStats({
            completedSessions: data.length,
            distinctOrganisations: Array.from(
              new Set(data.map((item) => item.organisation))
            ).length,
          });
        }
      } catch (err) {
        console.error(err);
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
