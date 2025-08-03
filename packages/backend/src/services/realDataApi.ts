import { supabase } from '../config/supabase';

interface RealPoliticianScore {
  topic_id: string;
  topic_name: string;
  score: number;
  vote_count: number;
  confidence: number;
  last_calculated: string;
}

interface RealVotingRecord {
  id: string;
  politician_id: string;
  bill_id: string;
  vote: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  vote_date: string;
  congress_member_id: string;
  member_name: string;
  member_party: string;
  member_state: string;
  bill_title: string;
  bill_number: string;
  bill_type: string;
  topics: string[];
}

interface RealPoliticianData {
  id: string;
  name: string;
  party: string;
  state: string;
  chamber: string;
  overall_score: number | null;
  philosophy: string | null;
  score_confidence: number | null;
  total_votes: number;
  attendance_rate: number | null;
}

/**
 * Service for fetching real Congressional data from the database
 */
export class RealDataApiService {

  /**
   * Get real political scores for a politician across all topics
   */
  async getPoliticianScores(politicianId: string): Promise<RealPoliticianScore[]> {
    try {
      const { data, error } = await supabase
        .from('political_scores')
        .select(`
          topic_id,
          score,
          vote_count,
          confidence,
          last_calculated,
          topics!inner (
            name
          )
        `)
        .eq('politician_id', politicianId)
        .order('vote_count', { ascending: false });

      if (error) {
        console.error('Error fetching politician scores:', error);
        return [];
      }

      return (data || []).map(score => ({
        topic_id: score.topic_id,
        topic_name: (score.topics as any).name,
        score: score.score,
        vote_count: score.vote_count,
        confidence: score.confidence,
        last_calculated: score.last_calculated
      }));

    } catch (error) {
      console.error('Error in getPoliticianScores:', error);
      return [];
    }
  }

  /**
   * Get real voting history for a politician
   */
  async getPoliticianVotingHistory(politicianId: string, limit: number = 50): Promise<RealVotingRecord[]> {
    try {
      const { data, error } = await supabase
        .from('voting_records')
        .select(`
          id,
          politician_id,
          bill_id,
          vote,
          vote_date,
          congress_member_id,
          member_name,
          member_party,
          member_state,
          bills!inner (
            title,
            bill_number,
            bill_type,
            bill_topics (
              topics (
                name
              )
            )
          )
        `)
        .eq('politician_id', politicianId)
        .order('vote_date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching voting history:', error);
        return [];
      }

      return (data || []).map(record => {
        const bill = record.bills as any;
        const topics = bill.bill_topics?.map((bt: any) => bt.topics.name) || [];

        return {
          id: record.id,
          politician_id: record.politician_id,
          bill_id: record.bill_id,
          vote: record.vote,
          vote_date: record.vote_date,
          congress_member_id: record.congress_member_id,
          member_name: record.member_name,
          member_party: record.member_party,
          member_state: record.member_state,
          bill_title: bill.title,
          bill_number: bill.bill_number?.toString() || '',
          bill_type: bill.bill_type || '',
          topics
        };
      });

    } catch (error) {
      console.error('Error in getPoliticianVotingHistory:', error);
      return [];
    }
  }

  /**
   * Get comprehensive politician data with statistics
   */
  async getPoliticianWithStats(politicianId: string): Promise<RealPoliticianData | null> {
    try {
      const { data, error } = await supabase
        .from('politician_voting_stats')
        .select('*')
        .eq('politician_id', politicianId)
        .single();

      if (error) {
        console.error('Error fetching politician stats:', error);
        return null;
      }

      return data as RealPoliticianData;

    } catch (error) {
      console.error('Error in getPoliticianWithStats:', error);
      return null;
    }
  }

  /**
   * Get all politicians with their voting statistics
   */
  async getAllPoliticiansWithStats(): Promise<RealPoliticianData[]> {
    try {
      const { data, error } = await supabase
        .from('politician_voting_stats')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching all politicians stats:', error);
        return [];
      }

      return data as RealPoliticianData[];

    } catch (error) {
      console.error('Error in getAllPoliticiansWithStats:', error);
      return [];
    }
  }

  /**
   * Check if we have real voting data available
   */
  async hasRealVotingData(): Promise<{
    hasData: boolean;
    billCount: number;
    voteCount: number;
    scoreCount: number;
  }> {
    try {
      // Check for bills
      const { count: billCount } = await supabase
        .from('bills')
        .select('*', { count: 'exact', head: true });

      // Check for voting records
      const { count: voteCount } = await supabase
        .from('voting_records')
        .select('*', { count: 'exact', head: true });

      // Check for political scores
      const { count: scoreCount } = await supabase
        .from('political_scores')
        .select('*', { count: 'exact', head: true });

      const hasData = (billCount || 0) > 0 && (voteCount || 0) > 0;

      return {
        hasData,
        billCount: billCount || 0,
        voteCount: voteCount || 0,
        scoreCount: scoreCount || 0
      };

    } catch (error) {
      console.error('Error checking for real voting data:', error);
      return {
        hasData: false,
        billCount: 0,
        voteCount: 0,
        scoreCount: 0
      };
    }
  }

  /**
   * Get bills by topic for analysis
   */
  async getBillsByTopic(topicId: string, limit: number = 20): Promise<Array<{
    id: string;
    title: string;
    bill_type: string;
    bill_number: number;
    progressive_score: number;
    sponsor_name: string;
    vote_count: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('bill_details')
        .select('*')
        .contains('topics', [topicId])
        .order('vote_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching bills by topic:', error);
        return [];
      }

      return data.map(bill => ({
        id: bill.id,
        title: bill.title,
        bill_type: bill.bill_type || '',
        bill_number: bill.bill_number || 0,
        progressive_score: bill.progressive_score || 0,
        sponsor_name: bill.sponsor_name || 'Unknown',
        vote_count: bill.vote_count || 0
      }));

    } catch (error) {
      console.error('Error in getBillsByTopic:', error);
      return [];
    }
  }

  /**
   * Get voting patterns analysis for all politicians on a topic
   */
  async getTopicVotingPatterns(topicId: string): Promise<Array<{
    politician_id: string;
    politician_name: string;
    party: string;
    state: string;
    chamber: string;
    score: number;
    vote_count: number;
    confidence: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('political_scores')
        .select(`
          politician_id,
          score,
          vote_count,
          confidence,
          politicians!inner (
            name,
            party,
            state,
            chamber
          )
        `)
        .eq('topic_id', topicId)
        .gte('vote_count', 1) // Only include politicians with actual votes
        .order('score', { ascending: false });

      if (error) {
        console.error('Error fetching topic voting patterns:', error);
        return [];
      }

      return (data || []).map(item => {
        const politician = item.politicians as any;
        return {
          politician_id: item.politician_id,
          politician_name: politician.name,
          party: politician.party,
          state: politician.state,
          chamber: politician.chamber,
          score: item.score,
          vote_count: item.vote_count,
          confidence: item.confidence
        };
      });

    } catch (error) {
      console.error('Error in getTopicVotingPatterns:', error);
      return [];
    }
  }

  /**
   * Get recent congressional activity summary
   */
  async getRecentActivity(): Promise<{
    recentBills: number;
    recentVotes: number;
    lastSync: string | null;
  }> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Count recent bills
      const { count: recentBills } = await supabase
        .from('bills')
        .select('*', { count: 'exact', head: true })
        .gte('introduced_date', thirtyDaysAgo.toISOString());

      // Count recent votes
      const { count: recentVotes } = await supabase
        .from('voting_records')
        .select('*', { count: 'exact', head: true })
        .gte('vote_date', thirtyDaysAgo.toISOString());

      // Get last sync time
      const { data: lastBill } = await supabase
        .from('bills')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        recentBills: recentBills || 0,
        recentVotes: recentVotes || 0,
        lastSync: lastBill?.created_at || null
      };

    } catch (error) {
      console.error('Error in getRecentActivity:', error);
      return {
        recentBills: 0,
        recentVotes: 0,
        lastSync: null
      };
    }
  }
}

export const realDataApi = new RealDataApiService(); 