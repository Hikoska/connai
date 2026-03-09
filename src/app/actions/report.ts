'use server';

import { createClient } from '@/utils/supabase/server';

export interface TranscriptItem {
  role: string | null;
  messages: {
    user_role: string;
    content: string;
    created_at: string;
  }[];
}

export async function aggregateCompanyTranscripts(companyId: string) {
  const supabase = await createClient();

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // Verify the company exists and the user has access via RLS
  const { data: company, error: compError } = await supabase
    .from('companies')
    .select('id, name, industry')
    .eq('id', companyId)
    .single();

  if (compError || !company) {
    throw new Error('Company not found or access denied');
  }

  // Fetch all interview sessions and their nested chat messages
  const { data: sessions, error: sessError } = await supabase
    .from('interview_sessions')
    .select(`
      id,
      role,
      status,
      chat_messages (
        user_role,
        content,
        created_at
      )
    `)
    .eq('company_id', companyId);

  if (sessError) {
    throw new Error(`Failed to fetch context: ${sessError.message}`);
  }

  // Format the returned data and filter empty transcripts
  const transcripts: TranscriptItem[] = (sessions || [])
    .filter(session => session.chat_messages && session.chat_messages.length > 0)
    .map(session => {
      // Sort messages chronologically
      const sortedMessages = session.chat_messages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      return {
        role: session.role,
        messages: sortedMessages,
      };
    });

  // Condense the chats into a clean string directly injectable as LLM context
  let promptContext = `Company Name: ${company.name}\n`;
  promptContext += `Industry: ${company.industry || 'Unknown'}\n\n`;
  promptContext += `--- Employee Interviews Transcripts ---\n\n`;

  if (transcripts.length === 0) {
    promptContext += `No interview transcripts available yet.\n`;
  } else {
    transcripts.forEach((transcript, index) => {
      promptContext += `\n[Interview ${index + 1} - Employee Role: ${transcript.role || 'Unspecified'}]\n`;
      transcript.messages.forEach(msg => {
        const actor = msg.user_role === 'model' ? 'AI' : 'Employee';
        promptContext += `${actor}: ${msg.content}\n`;
      });
    });
  }

  return {
    company,
    rawTranscripts: transcripts,
    geminiPromptContext: promptContext.trim(),
  };
}
