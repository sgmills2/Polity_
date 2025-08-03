import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Database } from '../types/supabase';

// Load environment variables
dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase credentials. Please check your .env file.');
}

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      fetch: (url, init) => {
        console.log('Supabase Request:', { url, init });
        return fetch(url, init);
      }
    }
  }
); 