import axios from 'axios';

import { supabase } from '../config/supabase';

interface CongressBill {
  url: string;
  number: string;
  title: string;
  congress: number;
  introducedDate: string;
  type: string;
  originChamber: string;
  sponsors?: Array<{
    bioguideId: string;
    fullName: string;
    party: string;
    state: string;
  }>;
  summary?: {
    text: string;
  };
  policyArea?: {
    name: string;
  };
  subjects?: any; // Make this flexible to handle different API response formats
}

interface CongressVote {
  congress: number;
  chamber: string;
  session: number;
  rollCall: number;
  url: string;
  date: string;
  question: string;
  description: string;
  voteType: string;
  result: string;
  bill?: {
    url: string;
    number: string;
    title: string;
  };
  amendment?: {
    number: string;
    description: string;
  };
  votes: {
    yea: number;
    nay: number;
    present: number;
    notVoting: number;
  };
  members?: Array<{
    bioguideId: string;
    name: string;
    party: string;
    state: string;
    vote: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  }>;
}

/**
 * Service for syncing real Congressional voting data
 */
export class RealVotingDataService {
  private readonly congressApiKey: string;
  private readonly baseUrl = 'https://api.congress.gov/v3';

  constructor() {
    this.congressApiKey = process.env.CONGRESS_API_KEY!;
    if (!this.congressApiKey) {
      throw new Error('CONGRESS_API_KEY environment variable is required');
    }
  }

  private async fetchFromCongressApi(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('api_key', this.congressApiKey);
    url.searchParams.append('format', 'json');

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value.toString());
    });

    const response = await axios.get(url.toString());
    return response.data;
  }

  /**
   * Sync bills from Congress.gov and classify them politically
   */
  async syncBills(congress: number = 118, limit: number = 50): Promise<{
    success: boolean;
    billsSynced: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let billsSynced = 0;

    try {
      console.log(`🏛️ Syncing bills from Congress ${congress}...`);

      // Fetch bills from Congress API
      const billsData = await this.fetchFromCongressApi(`/bill/${congress}`, {
        limit,
        sort: 'updateDate+desc'
      });

      if (!billsData.bills) {
        throw new Error('No bills data received from Congress API');
      }

      for (const billSummary of billsData.bills) {
        try {
          // Get detailed bill information
          const billDetailUrl = billSummary.url.replace(this.baseUrl, '');
          const billDetail = await this.fetchFromCongressApi(billDetailUrl);
          
          if (!billDetail.bill) continue;

          const bill: CongressBill = billDetail.bill;
          
          // Find or create sponsor politician
          let sponsorId: string | null = null;
          if (bill.sponsors && bill.sponsors.length > 0) {
            const sponsor = bill.sponsors[0];
            const { data: politician } = await supabase
              .from('politicians')
              .select('id')
              .eq('congress_id', sponsor.bioguideId)
              .single();
            
            sponsorId = politician?.id || null;
          }

          // Calculate progressive score based on bill content and keywords
          const progressiveScore = this.calculateBillProgressiveScore(bill);

          // Insert or update bill
          const { data: existingBill } = await supabase
            .from('bills')
            .select('id')
            .eq('congress_id', bill.number)
            .eq('congress', bill.congress)
            .single();

          const billData = {
            congress_id: bill.number,
            congress: bill.congress,
            title: bill.title,
            summary: bill.summary?.text || null,
            introduced_date: bill.introducedDate,
            status: 'Introduced', // You can enhance this with more detailed status
            bill_type: bill.type,
            bill_number: parseInt(bill.number.replace(/[^\d]/g, '')), // Extract numeric part
            sponsor_id: sponsorId,
            progressive_score: progressiveScore,
            chamber: bill.originChamber?.toLowerCase() === 'house' ? 'house' : 'senate',
            url: bill.url,
            policy_area: bill.policyArea?.name || null,
            subjects: (() => {
              try {
                if (bill.subjects && Array.isArray(bill.subjects)) {
                  return bill.subjects.map((s: any) => {
                    if (typeof s === 'string') return s;
                    if (s && s.name) return s.name;
                    return String(s || '');
                  }).filter(Boolean);
                }
                return [];
              } catch {
                return [];
              }
            })()
          };

          if (existingBill) {
            await supabase
              .from('bills')
              .update(billData)
              .eq('id', existingBill.id);
          } else {
            const { data: newBill } = await supabase
              .from('bills')
              .insert(billData)
              .select('id')
              .single();

            if (newBill) {
              // Associate bill with topics based on content analysis
              await this.associateBillWithTopics(newBill.id, bill);
            }
          }

          billsSynced++;
          console.log(`✅ Synced bill: ${bill.number} - ${bill.title}`);

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          errors.push(`Error syncing bill ${billSummary.number}: ${error}`);
          console.error(`❌ Error syncing bill ${billSummary.number}:`, error);
        }
      }

      return {
        success: errors.length === 0,
        billsSynced,
        errors
      };

    } catch (error) {
      errors.push(`Fatal error in bill sync: ${error}`);
      return {
        success: false,
        billsSynced,
        errors
      };
    }
  }

  /**
   * Sync voting records for a specific chamber and congress
   */
  async syncVotes(congress: number = 118, chamber: 'house' | 'senate', limit: number = 20): Promise<{
    success: boolean;
    votesSynced: number;
    recordsSynced: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let votesSynced = 0;
    let recordsSynced = 0;

    try {
      console.log(`🗳️ Syncing ${chamber} votes from Congress ${congress}...`);

      // Fetch votes from Congress API
      const votesData = await this.fetchFromCongressApi(`/vote/${congress}/${chamber}`, {
        limit,
        sort: 'date+desc'
      });

      if (!votesData.votes) {
        throw new Error('No votes data received from Congress API');
      }

      for (const voteSummary of votesData.votes) {
        try {
          // Get detailed vote information
          const voteDetailUrl = voteSummary.url.replace(this.baseUrl, '');
          const voteDetail = await this.fetchFromCongressApi(voteDetailUrl);
          
          if (!voteDetail.vote) continue;

          const vote: CongressVote = voteDetail.vote;

          // Find associated bill if any
          let billId: string | null = null;
          if (vote.bill) {
            const { data: bill } = await supabase
              .from('bills')
              .select('id')
              .eq('congress_id', vote.bill.number)
              .eq('congress', vote.congress)
              .single();
            
            billId = bill?.id || null;
          }

          // Insert congressional vote record
          const { data: existingVote } = await supabase
            .from('congressional_votes')
            .select('id')
            .eq('congress', vote.congress)
            .eq('chamber', vote.chamber.toLowerCase())
            .eq('session', vote.session)
            .eq('roll_call', vote.rollCall)
            .single();

          const voteData = {
            congress: vote.congress,
            chamber: vote.chamber.toLowerCase() as 'house' | 'senate',
            session: vote.session,
            roll_call: vote.rollCall,
            vote_number: `${vote.congress}-${vote.rollCall}`,
            bill_id: billId,
            vote_date: vote.date,
            vote_question: vote.question,
            vote_type: vote.voteType,
            vote_result: vote.result,
            vote_description: vote.description,
            yea_count: vote.votes.yea,
            nay_count: vote.votes.nay,
            present_count: vote.votes.present,
            not_voting_count: vote.votes.notVoting
          };

          let congressionalVoteId: string;

          if (existingVote) {
            await supabase
              .from('congressional_votes')
              .update(voteData)
              .eq('id', existingVote.id);
            congressionalVoteId = existingVote.id;
          } else {
            const { data: newVote } = await supabase
              .from('congressional_votes')
              .insert(voteData)
              .select('id')
              .single();
            
            congressionalVoteId = newVote!.id;
            votesSynced++;
          }

          // Sync individual member votes if available
          if (vote.members && vote.members.length > 0) {
            for (const memberVote of vote.members) {
              try {
                // Find politician by bioguide ID
                const { data: politician } = await supabase
                  .from('politicians')
                  .select('id')
                  .eq('congress_id', memberVote.bioguideId)
                  .single();

                if (politician && billId) {
                  // Insert voting record
                  const { data: existingRecord } = await supabase
                    .from('voting_records')
                    .select('id')
                    .eq('politician_id', politician.id)
                    .eq('bill_id', billId)
                    .eq('congressional_vote_id', congressionalVoteId)
                    .single();

                  if (!existingRecord) {
                    await supabase
                      .from('voting_records')
                      .insert({
                        politician_id: politician.id,
                        bill_id: billId,
                        vote: memberVote.vote,
                        vote_date: vote.date,
                        congressional_vote_id: congressionalVoteId,
                        congress_member_id: memberVote.bioguideId,
                        member_name: memberVote.name,
                        member_party: memberVote.party,
                        member_state: memberVote.state
                      });

                    recordsSynced++;
                  }
                }
              } catch (memberError) {
                errors.push(`Error syncing vote for ${memberVote.name}: ${memberError}`);
              }
            }
          }

          console.log(`✅ Synced vote: ${vote.congress}-${vote.rollCall} - ${vote.question}`);

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          errors.push(`Error syncing vote ${voteSummary.rollCall}: ${error}`);
          console.error(`❌ Error syncing vote ${voteSummary.rollCall}:`, error);
        }
      }

      return {
        success: errors.length === 0,
        votesSynced,
        recordsSynced,
        errors
      };

    } catch (error) {
      errors.push(`Fatal error in votes sync: ${error}`);
      return {
        success: false,
        votesSynced,
        recordsSynced,
        errors
      };
    }
  }

  /**
   * Calculate political scores for all politicians based on real voting data
   */
  async calculateRealPoliticalScores(): Promise<{
    success: boolean;
    politiciansScored: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let politiciansScored = 0;

    try {
      console.log('📊 Calculating real political scores...');

      // Get all politicians
      const { data: politicians } = await supabase
        .from('politicians')
        .select('id, name');

      if (!politicians) {
        throw new Error('No politicians found');
      }

      // Get all topics
      const { data: topics } = await supabase
        .from('topics')
        .select('id, name');

      if (!topics) {
        throw new Error('No topics found');
      }

      for (const politician of politicians) {
        try {
          for (const topic of topics) {
            // Use the database function to calculate score
            const { data: scoreData } = await supabase
              .rpc('calculate_politician_score', {
                politician_uuid: politician.id,
                topic_uuid: topic.id
              });

            if (scoreData && scoreData.length > 0) {
              const result = scoreData[0];
              
              // Upsert political score
              await supabase
                .from('political_scores')
                .upsert({
                  politician_id: politician.id,
                  topic_id: topic.id,
                  score: result.score,
                  vote_count: result.vote_count,
                  confidence: result.confidence,
                  last_calculated: new Date().toISOString()
                }, {
                  onConflict: 'politician_id,topic_id'
                });
            }
          }

          // Calculate overall score (average of all topic scores)
          const { data: topicScores } = await supabase
            .from('political_scores')
            .select('score, confidence')
            .eq('politician_id', politician.id);

          if (topicScores && topicScores.length > 0) {
            const avgScore = topicScores.reduce((sum, s) => sum + s.score, 0) / topicScores.length;
            
            // Determine philosophy
            let philosophy: 'Progressive' | 'Liberal' | 'Moderate' | 'Conservative' | 'Very Conservative';
            if (avgScore < -0.6) philosophy = 'Progressive';
            else if (avgScore < -0.2) philosophy = 'Liberal';
            else if (avgScore < 0.2) philosophy = 'Moderate';
            else if (avgScore < 0.6) philosophy = 'Conservative';
            else philosophy = 'Very Conservative';

            // Upsert aggregate score
            await supabase
              .from('aggregate_scores')
              .upsert({
                politician_id: politician.id,
                overall_score: avgScore,
                philosophy
              }, {
                onConflict: 'politician_id'
              });
          }

          politiciansScored++;
          console.log(`✅ Calculated scores for: ${politician.name}`);

        } catch (error) {
          errors.push(`Error calculating scores for ${politician.name}: ${error}`);
        }
      }

      return {
        success: errors.length === 0,
        politiciansScored,
        errors
      };

    } catch (error) {
      errors.push(`Fatal error in score calculation: ${error}`);
      return {
        success: false,
        politiciansScored,
        errors
      };
    }
  }

  /**
   * Full sync pipeline: bills -> votes -> scores
   */
  async fullSync(congress: number = 118, options: {
    billLimit?: number;
    voteLimit?: number;
    calculateScores?: boolean;
  } = {}): Promise<{
    success: boolean;
    summary: {
      bills: number;
      houseVotes: number;
      senateVotes: number;
      totalRecords: number;
      politiciansScored: number;
    };
    errors: string[];
  }> {
    const { billLimit = 100, voteLimit = 50, calculateScores = true } = options;
    const errors: string[] = [];
    let summary = {
      bills: 0,
      houseVotes: 0,
      senateVotes: 0,
      totalRecords: 0,
      politiciansScored: 0
    };

    try {
      console.log(`🚀 Starting full voting data sync for Congress ${congress}...`);

      // Step 1: Sync bills
      console.log('\n📄 Step 1: Syncing bills...');
      const billResult = await this.syncBills(congress, billLimit);
      summary.bills = billResult.billsSynced;
      errors.push(...billResult.errors);

      // Step 2: Sync House votes
      console.log('\n🏛️ Step 2: Syncing House votes...');
      const houseResult = await this.syncVotes(congress, 'house', voteLimit);
      summary.houseVotes = houseResult.votesSynced;
      summary.totalRecords += houseResult.recordsSynced;
      errors.push(...houseResult.errors);

      // Step 3: Sync Senate votes
      console.log('\n🏛️ Step 3: Syncing Senate votes...');
      const senateResult = await this.syncVotes(congress, 'senate', voteLimit);
      summary.senateVotes = senateResult.votesSynced;
      summary.totalRecords += senateResult.recordsSynced;
      errors.push(...senateResult.errors);

      // Step 4: Calculate scores
      if (calculateScores) {
        console.log('\n📊 Step 4: Calculating political scores...');
        const scoreResult = await this.calculateRealPoliticalScores();
        summary.politiciansScored = scoreResult.politiciansScored;
        errors.push(...scoreResult.errors);
      }

      console.log('\n🎉 Full sync complete!');
      console.log(`📊 Summary: ${summary.bills} bills, ${summary.houseVotes + summary.senateVotes} votes, ${summary.totalRecords} records, ${summary.politiciansScored} politicians scored`);

      return {
        success: errors.length < 10, // Allow some errors but not too many
        summary,
        errors
      };

    } catch (error) {
      errors.push(`Fatal error in full sync: ${error}`);
      return {
        success: false,
        summary,
        errors
      };
    }
  }

  private calculateBillProgressiveScore(bill: CongressBill): number {
    const title = bill.title.toLowerCase();
    const summary = bill.summary?.text?.toLowerCase() || '';
    const policyArea = bill.policyArea?.name?.toLowerCase() || '';
    
    // Safely handle subjects - skip if not available
    let subjects = '';
    try {
      if (bill.subjects && Array.isArray(bill.subjects)) {
        subjects = bill.subjects.map((s: any) => {
          if (typeof s === 'string') return s;
          if (s && s.name) return s.name;
          return String(s || '');
        }).filter(Boolean).join(' ').toLowerCase();
      }
    } catch (error) {
      // Ignore subjects if there's an error processing them
      subjects = '';
    }
    
    const content = `${title} ${summary} ${policyArea} ${subjects}`;

    // Progressive keywords (positive score)
    const progressiveKeywords = [
      'climate', 'environment', 'renewable', 'clean energy', 'healthcare', 'medicare',
      'medicaid', 'affordable care', 'reproductive', 'abortion', 'contraception',
      'civil rights', 'voting rights', 'lgbtq', 'equality', 'justice', 'minimum wage',
      'affordable housing', 'student loan', 'education funding', 'childcare',
      'paid leave', 'union', 'worker protection', 'gun control', 'gun safety',
      'immigration reform', 'pathway to citizenship', 'social security', 'veterans benefits'
    ];

    // Conservative keywords (negative score)
    const conservativeKeywords = [
      'defense spending', 'military', 'border security', 'immigration enforcement',
      'tax reduction', 'tax cut', 'deregulation', 'small business', 'second amendment',
      'religious freedom', 'school choice', 'voucher', 'energy independence',
      'oil', 'gas', 'coal', 'traditional values', 'parental rights'
    ];

    let score = 0;
    let matches = 0;

    // Count progressive matches
    progressiveKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        score += 0.1;
        matches++;
      }
    });

    // Count conservative matches
    conservativeKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        score -= 0.1;
        matches++;
      }
    });

    // Normalize score to [-1, 1] range
    if (matches === 0) return 0;
    return Math.max(-1, Math.min(1, score));
  }

  private async associateBillWithTopics(billId: string, bill: CongressBill): Promise<void> {
    const title = bill.title.toLowerCase();
    const summary = bill.summary?.text?.toLowerCase() || '';
    const policyArea = bill.policyArea?.name?.toLowerCase() || '';
    
    // Safely handle subjects - use empty string if not available
    let subjects = '';
    try {
      if (bill.subjects && Array.isArray(bill.subjects)) {
        subjects = bill.subjects.map((s: any) => {
          // Handle both string and object formats
          if (typeof s === 'string') return s.toLowerCase();
          if (s && s.name) return s.name.toLowerCase();
          return String(s || '').toLowerCase();
        }).filter(Boolean).join(' ');
      }
    } catch (error) {
      // If subjects processing fails, continue without them
      subjects = '';
    }
    
    const content = `${title} ${summary} ${policyArea} ${subjects}`;

    // Topic associations based on keywords
    const topicMappings = [
      {
        topicId: '01234567-89ab-cdef-0123-456789abcdef', // Healthcare
        keywords: ['health', 'healthcare', 'medical', 'medicare', 'medicaid', 'insurance', 'care', 'hospital', 'doctor', 'nurse', 'medicine']
      },
      {
        topicId: '11234567-89ab-cdef-0123-456789abcdef', // Reproductive Rights
        keywords: ['reproductive', 'abortion', 'contraception', 'birth control', 'family planning', 'pregnancy', 'maternal']
      },
      {
        topicId: '21234567-89ab-cdef-0123-456789abcdef', // Defense & War
        keywords: ['defense', 'military', 'armed forces', 'war', 'security', 'veteran', 'army', 'navy', 'air force', 'marines']
      },
      {
        topicId: '31234567-89ab-cdef-0123-456789abcdef', // Climate Action
        keywords: ['climate', 'environment', 'energy', 'renewable', 'carbon', 'emission', 'pollution', 'conservation', 'green', 'sustainable']
      },
      {
        topicId: '41234567-89ab-cdef-0123-456789abcdef', // Progressive Taxation
        keywords: ['tax', 'taxation', 'revenue', 'budget', 'fiscal', 'economic', 'finance', 'wealth', 'income', 'corporate']
      },
      {
        topicId: '51234567-89ab-cdef-0123-456789abcdef', // Civil Rights
        keywords: ['civil rights', 'equality', 'discrimination', 'voting', 'lgbtq', 'rights', 'justice', 'freedom', 'liberty', 'constitutional']
      }
    ];

    for (const mapping of topicMappings) {
      const hasMatch = mapping.keywords.some(keyword => content.includes(keyword));
      
      if (hasMatch) {
        await supabase
          .from('bill_topics')
          .upsert({
            bill_id: billId,
            topic_id: mapping.topicId
          }, {
            onConflict: 'bill_id,topic_id'
          });
      }
    }
  }
}

export const realVotingDataService = new RealVotingDataService(); 