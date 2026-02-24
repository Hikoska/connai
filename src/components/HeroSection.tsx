import React from 'react';
import { ReportCard } from '@/components/ReportCard';

export function HeroSection() {
  return (
    <section className="bg-[#0E1117] text-white px-6 py-20 md:py-28">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
        {/* Left: copy */}
        <div className="flex-1">
          <span className="inline-block bg-[#0D5C63] text-white text-xs font-semibold px-3 py-1 rounded-full mb-5 tracking-wide">
            AI-Powered Audit · Mauritius
          </span>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5">
            Know exactly where your business stands — in 30 minutes.
          </h1>
          <p className="text-white/70 text-lg mb-8 max-w-lg">
            Connai runs an AI-powered digital maturity audit and delivers a scored report your board can act on.
          </p>
          <a
            href="/interview"
            className="inline-block bg-[#0D5C63] hover:bg-[#0a4a50] text-white font-bold px-8 py-4 rounded-full transition-colors text-base"
          >
            Get my free audit →
          </a>
        </div>

        {/* Right: ReportCard mockup */}
        <div className="shrink-0">
          <ReportCard />
        </div>
      </div>
    </section>
  );
}
