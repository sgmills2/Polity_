import { supabase } from '../config/supabase';

export async function syncPoliticians() {
  try {
    const { data, error } = await supabase.functions.invoke('sync-congress', {
      method: 'POST',
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error syncing politicians:', error);
    throw error;
  }
}