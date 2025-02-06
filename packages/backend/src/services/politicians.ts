import { supabase } from '../config/supabase';
import type { Politician } from '@polity/shared';

export async function getPoliticians() {
  const { data, error } = await supabase
    .from('politicians')
    .select('*')
    .order('name');

  if (error) throw error;
  return data;
}

export async function getPoliticianById(id: string) {
  const { data, error } = await supabase
    .from('politicians')
    .select(`
      *,
      political_scores (
        topic_id,
        score
      ),
      aggregate_scores (
        overall_score,
        philosophy
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getPoliticianVotingHistory(id: string) {
  const { data, error } = await supabase
    .from('voting_records')
    .select(`
      *,
      bills (
        congress_id,
        title,
        summary,
        introduced_date,
        status
      )
    `)
    .eq('politician_id', id)
    .order('vote_date', { ascending: false });

  if (error) throw error;
  return data;
} 