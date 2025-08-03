import axios from 'axios';
import { supabase } from '../config/supabase';

interface CongressMember {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  nickname?: string;
  party: string;
  state: string;
  district?: number;
  chamber: 'house' | 'senate';
  terms: Array<{
    congress: number;
    startYear: number;
    endYear: number;
    chamber: 'house' | 'senate';
    memberType: string;
    party: string;
    state: string;
    district?: number;
    startDate: string;
    endDate: string;
  }>;
  served?: {
    house?: Array<{
      congress: number;
      start: string;
      end: string;
      party: string;
      state: string;
      district?: number;
    }>;
    senate?: Array<{
      congress: number;
      start: string;
      end: string;
      party: string;
      state: string;
      senatorClass?: string;
      senatorRank?: string;
    }>;
  };
  currentMember?: boolean;
  depiction?: {
    imageUrl?: string;
    attribution?: string;
  };
  officialWebsiteUrl?: string;
  addressInformation?: {
    city?: string;
    district?: string;
    officeAddress?: string;
    phoneNumber?: string;
  };
}

interface CongressResponse<T> {
  members?: T[];
  pagination: {
    count: number;
    next?: string;
  };
  request: {
    contentType: string;
    format: string;
  };
}

/**
 * Enhanced Congress.gov API Service
 * Comprehensive sync for current and historical federal legislators
 */
export class EnhancedCongressService {
  private readonly BASE_URL = 'https://api.congress.gov/v3';
  private readonly API_KEY = process.env.CONGRESS_API_KEY;

  constructor() {
    if (!this.API_KEY) {
      throw new Error('CONGRESS_API_KEY environment variable is required');
    }
  }

  private getHeaders() {
    return {
      'X-API-Key': this.API_KEY,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get current members of Congress with comprehensive data
   */
  async getCurrentMembers(options: {
    congress?: number;
    chamber?: 'house' | 'senate';
    currentMember?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    members: CongressMember[];
    pagination: { count: number; hasMore: boolean };
  }> {
    try {
      const congress = options.congress || 118; // Current Congress is 118
      const params = new URLSearchParams();
      
      if (options.currentMember !== false) params.append('currentMember', 'true');
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      
      // Use the correct Congress.gov API endpoint structure
      let endpoint = `${this.BASE_URL}/member`;
      
      const response = await axios.get(`${endpoint}?${params.toString()}`, {
        headers: this.getHeaders()
      });

      const data: CongressResponse<CongressMember> = response.data;

      // Filter by chamber if specified, since the API doesn't support chamber filtering directly
      let members = data.members || [];
      if (options.chamber) {
        members = members.filter(member => {
          // Check if member has a current role in the specified chamber
          const currentRole = member.terms?.find(term => 
            term.congress === congress && 
            term.chamber === options.chamber &&
            new Date(term.endDate) > new Date()
          );
          return !!currentRole;
        });
      }

      return {
        members,
        pagination: {
          count: data.pagination?.count || members.length,
          hasMore: !!data.pagination?.next
        }
      };
    } catch (error) {
      console.error('Error fetching current members:', error);
      return {
        members: [],
        pagination: { count: 0, hasMore: false }
      };
    }
  }

  /**
   * Get detailed member information including voting history
   */
  async getMemberDetails(bioguideId: string): Promise<CongressMember | null> {
    try {
      const response = await axios.get(
        `${this.BASE_URL}/member/${bioguideId}`,
        { headers: this.getHeaders() }
      );

      return response.data.member || null;
    } catch (error) {
      console.error(`Error fetching member details for ${bioguideId}:`, error);
      return null;
    }
  }

  /**
   * Comprehensive sync of all current federal legislators
   */
  async syncAllCurrentMembers(congress: number = 118): Promise<{
    success: boolean;
    houseMembers: number;
    senateMembers: number;
    totalMembers: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let houseMembers = 0;
    let senateMembers = 0;

    try {
      console.log(`🏛️ Starting comprehensive sync for Congress ${congress}...`);

      // Sync House members with pagination
      console.log('\n📊 Syncing House of Representatives...');
      const houseResult = await this.syncChamberMembers('house', congress);
      houseMembers = houseResult.count;
      errors.push(...houseResult.errors);

      // Sync Senate members with pagination
      console.log('\n📊 Syncing Senate...');
      const senateResult = await this.syncChamberMembers('senate', congress);
      senateMembers = senateResult.count;
      errors.push(...senateResult.errors);

      // Cleanup inactive members
      console.log('\n🧹 Cleaning up inactive members...');
      await this.cleanupInactiveMembers(congress);

      const totalMembers = houseMembers + senateMembers;
      
      console.log(`\n✅ Sync Complete!`);
      console.log(`   House: ${houseMembers} members`);
      console.log(`   Senate: ${senateMembers} members`);
      console.log(`   Total: ${totalMembers} members`);

      return {
        success: errors.length === 0,
        houseMembers,
        senateMembers,
        totalMembers,
        errors
      };

    } catch (error) {
      errors.push(`Fatal error in sync: ${error}`);
      return {
        success: false,
        houseMembers,
        senateMembers,
        totalMembers: houseMembers + senateMembers,
        errors
      };
    }
  }

  /**
   * Sync members for a specific chamber with pagination
   */
  private async syncChamberMembers(
    chamber: 'house' | 'senate',
    congress: number
  ): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;
    let offset = 0;
    const limit = 250; // Congress.gov max limit

    do {
      try {
        console.log(`   Fetching ${chamber} members (offset: ${offset})...`);
        
        const { members, pagination } = await this.getCurrentMembers({
          congress,
          chamber,
          currentMember: true,
          limit,
          offset
        });

        console.log(`   Processing ${members.length} ${chamber} members...`);

        for (const member of members) {
          try {
            // Get detailed member information
            const detailedMember = await this.getMemberDetails(member.bioguideId);
            const memberToSync = detailedMember || member;

            const success = await this.createOrUpdatePolitician(memberToSync, chamber, congress);
            if (success) {
              count++;
            } else {
              errors.push(`Failed to sync ${member.name} (${member.bioguideId})`);
            }

            // Rate limiting - be respectful to Congress.gov
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (error) {
            errors.push(`Error processing ${member.name}: ${error}`);
          }
        }

        offset += limit;
        
        // Break if no more pages
        if (!pagination.hasMore || members.length < limit) {
          break;
        }

        // Delay between pages
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        errors.push(`Error fetching ${chamber} page at offset ${offset}: ${error}`);
        break;
      }
    } while (true);

    return { count, errors };
  }

  /**
   * Create or update politician record in database
   */
  private async createOrUpdatePolitician(
    member: CongressMember,
    chamber: 'house' | 'senate',
    congress: number
  ): Promise<boolean> {
    try {
      // Get current term information
      const currentTerm = member.terms?.find(term => 
        term.congress === congress && term.chamber === chamber
      ) || member.terms?.[member.terms.length - 1];

      const politicianData = {
        congress_id: member.bioguideId,
        name: member.name,
        first_name: member.firstName,
        last_name: member.lastName,
        middle_name: member.middleName || null,
        suffix: member.suffix || null,
        nickname: member.nickname || null,
        state: member.state,
        chamber: chamber,
        district: member.district || null,
        party: member.party,
        role_title: chamber === 'house' ? 'Representative' : 'Senator',
        serving_since: currentTerm?.startDate || new Date().toISOString().split('T')[0],
        current_congress: congress,
        is_current: member.currentMember !== false,
        photo_url: member.depiction?.imageUrl || null,
        official_website: member.officialWebsiteUrl || null,
        office_address: member.addressInformation?.officeAddress || null,
        office_phone: member.addressInformation?.phoneNumber || null,
        description: this.generateDescription(member, chamber),
        last_updated: new Date().toISOString()
      };

      const { error } = await supabase
        .from('politicians')
        .upsert(politicianData, { 
          onConflict: 'congress_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`Error upserting politician ${member.name}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error in createOrUpdatePolitician for ${member.name}:`, error);
      return false;
    }
  }

  /**
   * Generate descriptive text for politician
   */
  private generateDescription(member: CongressMember, chamber: 'house' | 'senate'): string {
    const title = chamber === 'house' ? 'Representative' : 'Senator';
    const location = chamber === 'house' && member.district 
      ? `${member.state}-${member.district}`
      : member.state;

    return `${title} ${member.name} (${member.party}-${location})`;
  }

  /**
   * Remove politicians who are no longer serving
   */
  private async cleanupInactiveMembers(congress: number): Promise<void> {
    try {
      // Mark members as inactive if they're not in the current congress
      const { error } = await supabase
        .from('politicians')
        .update({ 
          is_current: false,
          last_updated: new Date().toISOString()
        })
        .neq('current_congress', congress);

      if (error) {
        console.error('Error cleaning up inactive members:', error);
      } else {
        console.log('✅ Inactive members cleanup complete');
      }
    } catch (error) {
      console.error('Error in cleanupInactiveMembers:', error);
    }
  }

  /**
   * Get voting records for enhanced political scoring
   */
  async getMemberVotingHistory(
    bioguideId: string,
    congress?: number
  ): Promise<Array<{
    voteId: string;
    voteDate: string;
    votePosition: string;
    billTitle: string;
    billId: string;
    congress: number;
    chamber: string;
  }>> {
    try {
      const congressNum = congress || 118;
      const response = await axios.get(
        `${this.BASE_URL}/member/${bioguideId}/votes`,
        { headers: this.getHeaders() }
      );

      // Process voting data for political scoring
      return response.data.votes?.map((vote: any) => ({
        voteId: vote.voteId || vote.id,
        voteDate: vote.date,
        votePosition: vote.position,
        billTitle: vote.bill?.title || 'Unknown',
        billId: vote.bill?.id || 'unknown',
        congress: congressNum,
        chamber: vote.chamber
      })) || [];

    } catch (error) {
      console.error(`Error fetching voting history for ${bioguideId}:`, error);
      return [];
    }
  }

  /**
   * Get recent legislative activity for real-time updates
   */
  async getRecentLegislativeActivity(_days: number = 30): Promise<{
    newMembers: CongressMember[];
    memberChanges: Array<{
      bioguideId: string;
      changeType: 'party_change' | 'district_change' | 'status_change';
      oldValue: string;
      newValue: string;
    }>;
  }> {
    try {
      // This would be implemented based on Congress.gov's activity endpoints
      // For now, return empty arrays as placeholder
      return {
        newMembers: [],
        memberChanges: []
      };
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return {
        newMembers: [],
        memberChanges: []
      };
    }
  }
}

// Export service instance
export const enhancedCongressService = new EnhancedCongressService(); 