import { serve } from 'https://deno.fresh.dev/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Database } from '../_shared/database.types.ts';

// Updated env var names to match Supabase conventions
const supabaseUrl = Deno.env.get('URL')!;
const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!;
const congressApiKey = Deno.env.get('CONGRESS_API_KEY')!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function fetchFromCongressApi(endpoint: string, params = {}) {
  const url = new URL(`https://api.congress.gov/v3${endpoint}`);
  url.searchParams.append('api_key', congressApiKey);
  url.searchParams.append('format', 'json');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value.toString());
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Congress API error: ${response.statusText}`);
  }
  return response.json();
}

async function syncMembers(chamber: 'SENATE' | 'HOUSE') {
  const { members } = await fetchFromCongressApi('/member', {
    congress: 118,
    chamber,
    limit: 250,
  });

  for (const member of members) {
    const nameParts = member.name.split(',');
    const lastName = nameParts[0].trim();
    const firstName = nameParts[1]?.split(' ')[1]?.trim() || '';

    const politician = {
      name: `${firstName} ${lastName}`,
      state: member.state,
      chamber: chamber.toLowerCase() as 'senate' | 'house',
      party: member.partyName === 'Democratic' ? 'D' : member.partyName === 'Republican' ? 'R' : 'I',
      photo_url: member.depiction?.imageUrl || null,
      description: chamber === 'SENATE' 
        ? `Senator from ${member.state}`
        : `Representative from ${member.state}${member.district ? `, District ${member.district}` : ''}`,
      role_title: chamber === 'SENATE' ? 'Senator' : 'Representative',
      serving_since: `${member.terms.item[0].startYear}-01-01`,
    };

    await supabase
      .from('politicians')
      .upsert(politician)
      .select();
  }
}

async function syncVotes(chamber: 'SENATE' | 'HOUSE') {
  const { votes } = await fetchFromCongressApi(`/congress/118/${chamber}/votes`, {
    limit: 250,
  });

  for (const vote of votes) {
    const voteDetails = await fetchFromCongressApi(
      `/congress/118/${chamber}/votes/${vote.voteNumber}`
    );

    if (voteDetails.bill) {
      const { data: bill } = await supabase
        .from('bills')
        .upsert({
          congress_id: `${voteDetails.bill.congress}${voteDetails.bill.type}${voteDetails.bill.number}`,
          congress: voteDetails.bill.congress,
          title: voteDetails.bill.title,
          summary: voteDetails.bill.summary || null,
          introduced_date: voteDetails.bill.introducedDate,
          status: voteDetails.bill.status,
        })
        .select()
        .single();

      if (bill) {
        for (const position of voteDetails.positions) {
          await supabase
            .from('voting_records')
            .upsert({
              politician_id: position.memberId,
              bill_id: bill.id,
              vote: position.vote,
              vote_date: voteDetails.date,
            });
        }
      }
    }
  }
}

serve(async (req) => {
  try {
    if (req.method === 'POST') {
      // Sync Senate data
      await syncMembers('SENATE');
      await syncVotes('SENATE');

      // Sync House data
      await syncMembers('HOUSE');
      await syncVotes('HOUSE');

      return new Response(JSON.stringify({ message: 'Sync completed successfully' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error during sync:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}); 