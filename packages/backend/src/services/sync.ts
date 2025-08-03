import { supabase } from '../config/supabase';

interface CongressMember {
  bioguideId: string;
  name: string;
  state: string;
  partyName: string;
  chamber: string;
  district?: string;
  depiction?: {
    imageUrl: string;
  };
  terms: {
    item: Array<{
      startYear: number;
      endYear: number;
      chamber: string; // Added this field
    }>;
  };
}

interface CongressApiResponse {
  members: CongressMember[];
}

async function fetchFromCongressApi(endpoint: string, params: Record<string, any> = {}): Promise<any> {
  const congressApiKey = process.env.CONGRESS_API_KEY;
  if (!congressApiKey) {
    throw new Error('CONGRESS_API_KEY environment variable is required');
  }

  const url = new URL(`https://api.congress.gov/v3${endpoint}`);
  url.searchParams.append('api_key', congressApiKey);
  url.searchParams.append('format', 'json');
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value.toString());
  });

  console.log(`Fetching from Congress API: ${url.pathname}`);
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function syncMembersFromChamber(chamber: 'SENATE' | 'HOUSE'): Promise<number> {
  console.log(`Syncing ${chamber} members...`);
  
  try {
    let syncedCount = 0;
    let errorCount = 0;
    let offset = 0;
    const limit = 100; // Reasonable batch size
    let hasMore = true;

    while (hasMore) {
      console.log(`Fetching ${chamber} members, offset ${offset}...`);
      
      const data: CongressApiResponse = await fetchFromCongressApi('/member', {
        congress: 118, // 118th Congress (2023-2025) - complete data available
        chamber: chamber.toLowerCase(), // Use lowercase for proper API format
        currentMember: 'true', // Only get current members
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (!data.members || !Array.isArray(data.members)) {
        console.log(`No members returned for ${chamber} at offset ${offset}`);
        break;
      }

      console.log(`Found ${data.members.length} ${chamber} members at offset ${offset}`);
      
      // If we got fewer members than the limit, this is the last page
      if (data.members.length < limit) {
        hasMore = false;
      }

      for (const member of data.members) {
        try {
          // Additional filtering: only sync members with current terms
          const latestTerm = member.terms?.item?.[0];
          if (!latestTerm) {
            console.warn(`Skipping member without terms: ${member.name}`);
            continue;
          }

          // Verify this member is actually in the chamber we're syncing
          const actualChamber = latestTerm.chamber === 'House of Representatives' ? 'house' : 'senate';
          const expectedChamber = chamber.toLowerCase() === 'house' ? 'house' : 'senate';
          
          if (actualChamber !== expectedChamber) {
            console.warn(`Skipping member in wrong chamber: ${member.name} (${actualChamber} vs ${expectedChamber})`);
            continue;
          }

          // Parse the name properly
          const nameParts = member.name.split(',');
          const lastName = nameParts[0]?.trim() || '';
          const firstName = nameParts[1]?.trim().replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)\s+/, '') || '';
          const fullName = `${firstName} ${lastName}`.trim();

          if (!fullName || !member.state) {
            console.warn(`Skipping member with incomplete data: ${member.name}, state: ${member.state}`);
            continue;
          }

          // Determine party abbreviation
          let party = 'I'; // Default to Independent
          if (member.partyName?.toLowerCase().includes('democrat')) {
            party = 'D';
          } else if (member.partyName?.toLowerCase().includes('republican')) {
            party = 'R';
          }

          // Determine serving since date
          const servingSince = latestTerm.startYear 
            ? `${latestTerm.startYear}-01-03`
            : new Date().toISOString().split('T')[0];

          // Create politician data
          const politicianData = {
            congress_id: member.bioguideId, // Use bioguideId as unique identifier
            name: fullName,
            state: member.state,
            chamber: actualChamber,
            party,
            photo_url: `https://www.congress.gov/img/member/${member.bioguideId.toLowerCase()}_200.jpg`,
            description: `${actualChamber === 'senate' ? 'Senator' : 'Representative'} from ${member.state}${member.district ? `, District ${member.district}` : ''}`,
            role_title: actualChamber === 'senate' ? 'Senator' : 'Representative',
            serving_since: servingSince,
          };

          // Insert politician (simple insert instead of upsert)
          const { error } = await supabase
            .from('politicians')
            .insert(politicianData)
            .select('id, name');

          if (error) {
            // If it's a duplicate error, that's expected - skip it
            if (error.code === '23505') { // Duplicate key error
              console.log(`⏭️  Skipping duplicate: ${fullName} (${member.state}-${party})`);
            } else {
              console.error(`Error inserting politician ${fullName}:`, error);
              errorCount++;
            }
          } else {
            syncedCount++;
            console.log(`✅ Successfully synced: ${fullName} (${member.state}-${party})`);
          }

          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 25));

        } catch (memberError) {
          console.error(`Error processing member ${member.name}:`, memberError);
          errorCount++;
        }
      }

      // Move to next page
      offset += limit;
      
      // Add delay between pages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`${chamber} sync complete: ${syncedCount} synced, ${errorCount} errors`);
    return syncedCount;

  } catch (error) {
    console.error(`Error syncing ${chamber} members:`, error);
    throw error;
  }
}

export async function syncPoliticians(): Promise<{ success: boolean; totalSynced: number; errors: string[] }> {
  const startTime = Date.now();
  console.log('Starting politician sync from Congress.gov...');
  
  const errors: string[] = [];
  let totalSynced = 0;

  try {
    // Verify Congress API key
    if (!process.env.CONGRESS_API_KEY) {
      throw new Error('Congress API key not configured');
    }

    // Sync Senate members
    try {
      const senateSynced = await syncMembersFromChamber('SENATE');
      totalSynced += senateSynced;
    } catch (error) {
      const errorMsg = `Failed to sync Senate: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    // Sync House members
    try {
      const houseSynced = await syncMembersFromChamber('HOUSE');
      totalSynced += houseSynced;
    } catch (error) {
      const errorMsg = `Failed to sync House: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    const duration = Date.now() - startTime;
    console.log(`Politician sync completed in ${duration}ms. Total synced: ${totalSynced}, Errors: ${errors.length}`);

    return {
      success: errors.length === 0 || totalSynced > 0, // Success if we synced at least some data
      totalSynced,
      errors
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error during sync';
    console.error('Sync failed:', errorMsg);
    errors.push(errorMsg);
    
    return {
      success: false,
      totalSynced,
      errors
    };
  }
}