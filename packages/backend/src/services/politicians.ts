import { supabase } from '../config/supabase';

export async function getPoliticians() {
  try {
    // Explicitly use the public schema
    const { data, error } = await supabase
      .from('politicians')
      .select('*')
      .order('name');

    if (error) {
      console.error('Supabase Error:', error);
      throw error;
    }
    
    // Transform data to match frontend property names
    return data?.map(politician => ({
      id: politician.id,
      name: politician.name,
      state: politician.state,
      chamber: politician.chamber,
      party: politician.party,
      photoUrl: politician.photo_url,
      description: politician.description,
      currentRole: politician.role_title,
      servingSince: politician.serving_since
    })) || [];
  } catch (e) {
    console.error('Error in getPoliticians:', e);
    // Return empty array instead of throwing to prevent frontend errors
    return [];
  }
}

export async function getPoliticianById(id: string) {
  try {
    const { data, error } = await supabase
      .from('politicians')
      .select(`*`)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase Error:', error);
      throw error;
    }
    
    // Transform data to match frontend property names
    return {
      id: data.id,
      name: data.name,
      state: data.state,
      chamber: data.chamber,
      party: data.party,
      photoUrl: data.photo_url,
      description: data.description,
      currentRole: data.role_title,
      servingSince: data.serving_since
    };
  } catch (e) {
    console.error('Error in getPoliticianById:', e);
    throw e;
  }
}

export async function getPoliticianVotingHistory(_id: string) {
  try {
    // For now just return empty array until we have voting_records table set up
    return [];
  } catch (e) {
    console.error('Error in getPoliticianVotingHistory:', e);
    return [];
  }
} 