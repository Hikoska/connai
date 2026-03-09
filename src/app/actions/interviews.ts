'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function generateInterviewLink(companyId: string, role: string) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Unauthorized' };
    }

    // Verify company ownership (extra security layer; RLS handles DB enforcement)
    const { data: company, error: compError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('created_by', user.id)
      .single();

    if (compError || !company) {
      return { error: 'Company not found or unauthorized' };
    }

    // Insert new session to generate a unique token
    const { data: session, error: sessError } = await supabase
      .from('interview_sessions')
      .insert({
        company_id: companyId,
        role: role,
        status: 'pending'
      })
      .select('token')
      .single();

    if (sessError || !session) {
      console.error('Session creation failed:', sessError);
      return { error: 'Failed to create interview session' };
    }

    const baceUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://connai.vercel.app';
    const link = `${baseUrl}/interview/${session.token}`;

    // Revalidate dashboard so any session lists update automatically
    revalidatePath('/dashboard');
    
    return { success: true, link };
  } catch (error: any) {
    console.error('Internal Server Action Error:', error);
    return { error: error.message || 'An unexpected error occurred.' };
  }
}
