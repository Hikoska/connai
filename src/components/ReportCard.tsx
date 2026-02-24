'use client';

import React from 'react';

interface Dimension {
  name: string;
  score: number;
}

const dimensions: Dimension[] = [
  { name: 'Strategy', score: 81 },
  { name: 'People', score: 68 },
  { name: 'Process', score: 74 },
  { name: 'Technology', score: 77 },
  { name: 'Data', score: 65 },
];

const SCORE = 72;
const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const OFFSET = CIRCUMFERENCE - (SCORE / 100) * CIRCUMFERENCE;

export function ReportCard() {
  return (
    <div className="bg-[#1a1f2e] rounded-2xl p-6 w-72 shadow-2xl border border-white/10">
      <div className="mb-4">
        <p className="text-xs text-white/50 uppercase tracking-widest">Digital Maturity Report</p>
        <p className="text-sm text-white/70 mt-0.5">Connai Demo Co.</p>
      </div>

      <div className="flex justify-center mb-5">
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r={RADIUS} stroke="#ffffff1a" strokeWidth="8" fill="none" />
          <circle
            cx="55" cy="55" r={RADIUS}
            stroke="#0D5C63" strokeWidth="8" fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={OFFSET}
            strokeLinecap="round"
            transform="rotate(-90 55 55)"
          />
          <text x="55" y="60" textAnchor="middle" fontSize="22" fontWeight="700" fill="white">
            {SCORE}/100
          </text>
        </svg>
      </div>

      <div className="space-y-2">
        {dimensions.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="text-xs text-white/60 w-20 shrink-0">{d.name}</span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#0D5C63] rounded-full" style={{ width: `${d.score}%` }} />
            </div>
            <span className="text-xs text-white/60 w-6 text-right">{d.score}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-white/30 mt-4 text-center">Generated in 28 min</p>
    </div>
  );
}
