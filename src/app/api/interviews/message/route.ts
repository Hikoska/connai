import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import ChatInterface from './ChatInterface';

interface Props {
  params: {
    token: string;
  };
}

export default async function InterviewPage({ params }: Props) {
  const supabase = await createClient();

  // Validate the token exists without requiring authentication
  const { data: session, error } = await supabase
    .from('interview_sessions')
    .select('*, companies(name)')
    .eq('token', params.token)
    .single();

  if (error || !session) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-800">
          Digital Maturity Interview - {session.companies?.name || 'Your Company'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Department / Role: <span className="font-medium">{session.role}</span>
        </p>
      </header>
      
      <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto p-4 md:p-6">
        <div className="bg-white flex-1 border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <ChatInterface sessionToken={session.token} sessionId={session.id} />
        </div>
      </main>
    </div>
  );
}
