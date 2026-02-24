import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const SocialProof = () => {
  const [stats, setStats] = useState({
    completedSessions: 0,
    distinctOrganisations: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase
          .from('interviews')
          .select('id, organisation', { count: 'exact' });
        if (data) {
          setStats({
            completedSessions: data.length,
            distinctOrganisations: Array.from(new Set(data.map((item) => item.organisation))).length,
          });
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <p>
        {stats.completedSessions} completed sessions from {stats.distinctOrganisations} organisations
      </p>
    </div>
  );
};

export default SocialProof;
