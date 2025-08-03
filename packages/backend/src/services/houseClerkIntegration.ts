import axios from 'axios';
import * as xml2js from 'xml2js';
import { supabase } from '../config/supabase';

interface HouseVoteRecord {
  rollCallNumber: string;
  year: string;
  date: string;
  question: string;
  description: string;
  result: string;
  totalYes: number;
  totalNo: number;
  totalPresent: number;
  totalNotVoting: number;
  votes: Array<{
    member: string;
    party: string;
    state: string;
    vote: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  }>;
}

/**
 * House Clerk XML API Integration
 * Sources: clerk.house.gov XML feeds
 */
export class HouseClerkService {
  private readonly BASE_URL = 'http://clerk.house.gov/evs';
  
  /**
   * Fetch House voting records for a specific year
   */
  async getHouseVotesForYear(year: number): Promise<string[]> {
    try {
      const response = await axios.get(`${this.BASE_URL}/${year}/index.xml`);
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);
      
      // Extract roll call numbers from the index
      const rollCalls: string[] = [];
      if (result.rollcall_index?.rollcall) {
        for (const rollCall of result.rollcall_index.rollcall) {
          if (rollCall.$.num) {
            rollCalls.push(rollCall.$.num);
          }
        }
      }
      
      return rollCalls;
    } catch (error) {
      console.error(`Error fetching House votes for ${year}:`, error);
      return [];
    }
  }

  /**
   * Fetch detailed vote record for a specific roll call
   */
  async getHouseRollCallVote(year: number, rollCallNumber: string): Promise<HouseVoteRecord | null> {
    try {
      const paddedNumber = rollCallNumber.padStart(3, '0');
      const response = await axios.get(`${this.BASE_URL}/${year}/roll${paddedNumber}.xml`);
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);
      
      const rollCall = result.rollcall_vote;
      if (!rollCall) return null;

      const votes: HouseVoteRecord['votes'] = [];
      
      // Parse individual member votes
      if (rollCall.recorded_vote) {
        for (const vote of rollCall.recorded_vote) {
          votes.push({
            member: vote.legislator?.[0]?.$.name_id || '',
            party: vote.legislator?.[0]?.$.party || '',
            state: vote.legislator?.[0]?.$.state || '',
            vote: this.normalizeVote(vote.vote?.[0] || '')
          });
        }
      }

      return {
        rollCallNumber,
        year: year.toString(),
        date: rollCall.action_date?.[0] || '',
        question: rollCall.vote_question?.[0] || '',
        description: rollCall.vote_desc?.[0] || '',
        result: rollCall.vote_result?.[0] || '',
        totalYes: parseInt(rollCall.vote_totals?.[0]?.yea_total?.[0] || '0'),
        totalNo: parseInt(rollCall.vote_totals?.[0]?.nay_total?.[0] || '0'),
        totalPresent: parseInt(rollCall.vote_totals?.[0]?.present_total?.[0] || '0'),
        totalNotVoting: parseInt(rollCall.vote_totals?.[0]?.not_voting_total?.[0] || '0'),
        votes
      };
    } catch (error) {
      console.error(`Error fetching roll call ${rollCallNumber} for ${year}:`, error);
      return null;
    }
  }

  /**
   * Normalize vote values to standard format
   */
  private normalizeVote(vote: string): 'Yea' | 'Nay' | 'Present' | 'Not Voting' {
    const normalized = vote.toLowerCase().trim();
    switch (normalized) {
      case 'aye':
      case 'yea':
      case 'yes':
        return 'Yea';
      case 'no':
      case 'nay':
        return 'Nay';
      case 'present':
        return 'Present';
      default:
        return 'Not Voting';
    }
  }

  /**
   * Sync House voting records to database
   */
  async syncHouseVotingRecords(year: number, limit: number = 50): Promise<{
    success: boolean;
    totalVotes: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let totalVotes = 0;

    try {
      console.log(`📊 Syncing House voting records for ${year}...`);
      
      // Get list of roll calls for the year
      const rollCalls = await this.getHouseVotesForYear(year);
      const limitedRollCalls = rollCalls.slice(0, limit);
      
      console.log(`Found ${rollCalls.length} roll calls, processing ${limitedRollCalls.length}`);

      for (const rollCall of limitedRollCalls) {
        try {
          const voteRecord = await this.getHouseRollCallVote(year, rollCall);
          if (!voteRecord) {
            errors.push(`Failed to fetch roll call ${rollCall}`);
            continue;
          }

          // Create or update bill record
          const billId = await this.createBillRecord({
            congress_id: `house-${year}-${rollCall}`,
            congress: year >= 2023 ? 118 : year >= 2021 ? 117 : 116, // Approximate congress mapping
            title: voteRecord.question,
            summary: voteRecord.description,
            introduced_date: voteRecord.date,
            status: voteRecord.result
          });

          if (!billId) {
            errors.push(`Failed to create bill record for roll call ${rollCall}`);
            continue;
          }

          // Store individual voting records
          let recordsCreated = 0;
          for (const vote of voteRecord.votes) {
            const success = await this.createVotingRecord({
              bill_id: billId,
              politician_name: vote.member,
              politician_state: vote.state,
              politician_party: vote.party,
              vote: vote.vote,
              vote_date: voteRecord.date
            });
            
            if (success) recordsCreated++;
          }

          console.log(`✅ Processed roll call ${rollCall}: ${recordsCreated} voting records`);
          totalVotes++;

          // Add delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          errors.push(`Error processing roll call ${rollCall}: ${error}`);
        }
      }

      return {
        success: errors.length === 0,
        totalVotes,
        errors
      };

    } catch (error) {
      errors.push(`Fatal error in sync: ${error}`);
      return {
        success: false,
        totalVotes,
        errors
      };
    }
  }

  /**
   * Create bill record in database
   */
  private async createBillRecord(bill: {
    congress_id: string;
    congress: number;
    title: string;
    summary: string;
    introduced_date: string;
    status: string;
  }): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('bills')
        .upsert(bill)
        .select('id')
        .single();

      if (error) {
        console.error('Error creating bill record:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Error in createBillRecord:', error);
      return null;
    }
  }

  /**
   * Create voting record in database
   */
  private async createVotingRecord(record: {
    bill_id: string;
    politician_name: string;
    politician_state: string;
    politician_party: string;
    vote: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
    vote_date: string;
  }): Promise<boolean> {
    try {
      // Find politician by name and state
      const { data: politician } = await supabase
        .from('politicians')
        .select('id')
        .eq('name', record.politician_name)
        .eq('state', record.politician_state)
        .single();

      if (!politician) {
        // Skip if politician not found (they might not be in our current database)
        return false;
      }

      const { error } = await supabase
        .from('voting_records')
        .upsert({
          politician_id: politician.id,
          bill_id: record.bill_id,
          vote: record.vote,
          vote_date: record.vote_date
        });

      if (error) {
        console.error('Error creating voting record:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in createVotingRecord:', error);
      return false;
    }
  }
}

/**
 * GovInfo API Integration
 * Enhanced legislative data source
 */
export class GovInfoService {
  private readonly BASE_URL = 'https://api.govinfo.gov';
  private readonly API_KEY = process.env.GOVINFO_API_KEY;

  /**
   * Get congressional bills with detailed metadata
   */
  async getCongressionalBills(params: {
    congress?: number;
    collection?: 'bills' | 'plaw' | 'crec';
    pageSize?: number;
    offset?: number;
  } = {}): Promise<any> {
    try {
      if (!this.API_KEY) {
        throw new Error('GOVINFO_API_KEY not configured');
      }

      const searchParams = new URLSearchParams({
        api_key: this.API_KEY,
        pageSize: params.pageSize?.toString() || '100',
        offset: params.offset?.toString() || '0',
        collection: params.collection || 'bills'
      });

      if (params.congress) {
        searchParams.append('congress', params.congress.toString());
      }

      const response = await axios.get(`${this.BASE_URL}/search?${searchParams}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching GovInfo data:', error);
      return null;
    }
  }

  /**
   * Get detailed bill information
   */
  async getBillDetails(packageId: string): Promise<any> {
    try {
      if (!this.API_KEY) {
        throw new Error('GOVINFO_API_KEY not configured');
      }

      const response = await axios.get(`${this.BASE_URL}/packages/${packageId}/summary`, {
        params: { api_key: this.API_KEY }
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching bill details for ${packageId}:`, error);
      return null;
    }
  }
}

// Export services
export const houseClerkService = new HouseClerkService();
export const govInfoService = new GovInfoService(); 