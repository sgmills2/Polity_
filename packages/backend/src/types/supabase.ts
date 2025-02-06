export type Chamber = 'senate' | 'house';
export type VoteType = 'Yea' | 'Nay' | 'Present' | 'Not Voting';
export type PhilosophyType = 'Progressive' | 'Liberal' | 'Moderate' | 'Conservative' | 'Very Conservative';

export interface Database {
  api: {
    Tables: {
      politicians: {
        Row: {
          id: string;
          name: string;
          state: string;
          chamber: Chamber;
          party: string;
          photo_url: string | null;
          description: string | null;
          role_title: string;
          serving_since: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['api']['Tables']['politicians']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['api']['Tables']['politicians']['Insert']>;
      };
      topics: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['api']['Tables']['topics']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['api']['Tables']['topics']['Insert']>;
      };
      bills: {
        Row: {
          id: string;
          congress_id: string;
          congress: number;
          title: string;
          summary: string | null;
          introduced_date: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['api']['Tables']['bills']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['api']['Tables']['bills']['Insert']>;
      };
      bill_topics: {
        Row: {
          bill_id: string;
          topic_id: string;
        };
        Insert: Database['api']['Tables']['bill_topics']['Row'];
        Update: Partial<Database['api']['Tables']['bill_topics']['Row']>;
      };
      voting_records: {
        Row: {
          id: string;
          politician_id: string;
          bill_id: string;
          vote: VoteType;
          vote_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['api']['Tables']['voting_records']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['api']['Tables']['voting_records']['Insert']>;
      };
      political_scores: {
        Row: {
          id: string;
          politician_id: string;
          topic_id: string;
          score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['api']['Tables']['political_scores']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['api']['Tables']['political_scores']['Insert']>;
      };
      aggregate_scores: {
        Row: {
          id: string;
          politician_id: string;
          overall_score: number;
          philosophy: PhilosophyType;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['api']['Tables']['aggregate_scores']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['api']['Tables']['aggregate_scores']['Insert']>;
      };
    };
  };
} 