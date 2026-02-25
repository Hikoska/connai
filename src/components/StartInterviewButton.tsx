'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface StartInterviewButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function StartInterviewButton({ className, children }: StartInterviewButtonProps) {
  const [stakeholderEmail, setStakeholderEmail] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stakeholder_email: stakeholderEmail, organisation }),
      });
      const data = await response.json();
      router.push(data.interview_url);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={className}
      >
        {children ?? 'Start Free Assessment'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Start Your Assessment</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={stakeholderEmail}
                  onChange={(e) => setStakeholderEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0D5C63]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organisation</label>
                <input
                  type="text"
                  required
                  value={organisation}
                  onChange={(e) => setOrganisation(e.target.value)}
                  placeholder="Your company name"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0D5C63]"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0D5C63] text-white font-semibold py-3 rounded-xl hover:bg-[#0a4a50] transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Starting...' : 'Begin Assessment →'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default StartInterviewButton;
