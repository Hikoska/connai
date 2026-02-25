'use client';

import styles from './benchmarking-panel.module.css';

const INDUSTRY_MEDIANS: Record<string, number> = {
  'IT Infrastructure': 52,
  'Cybersecurity': 45,
  'Data & Analytics': 48,
  'Process Automation': 43,
  'Digital CX': 56,
  'Workforce Culture': 41,
  'Innovation': 38,
  'Governance': 50,
};

interface Dimension {
  name: string;
  score: number;
}

interface Props {
  dimensions: Dimension[];
}

export default function BenchmarkingPanel({ dimensions }: Props) {
  if (!dimensions || dimensions.length === 0) return null;

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>How you compare</h2>
      <p className={styles.subtitle}>Your score vs industry median</p>
      <div className={styles.grid}>
        {dimensions.map((d) => {
          const median = INDUSTRY_MEDIANS[d.name] ?? 50;
          return (
            <div key={d.name} className={styles.row}>
              <div className={styles.label}>{d.name}</div>
              <div className={styles.bars}>
                <div className={styles.barTrack}>
                  <div className={styles.barOrg} style={{ width: `${d.score}%` }} />
                </div>
                <div className={styles.barTrack}>
                  <div className={styles.barMedian} style={{ width: `${median}%` }} />
                </div>
              </div>
              <div className={styles.scores}>
                <span className={styles.orgScore}>{d.score}</span>
                <span className={styles.medianScore}>&nbsp;/ {median}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.legend}>
        <span className={styles.legendOrg}>■ Your score</span>
        <span className={styles.legendMedian}>■ Industry median</span>
      </div>
    </div>
  );
}
