import { serve } from 'https://deno.fresh.dev/std@0.168.0/http/server.ts';
import { Pool } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

const congressApiKey = Deno.env.get('CONGRESS_API_KEY')!;
const dbPassword = Deno.env.get('DB_PASSWORD')!;

// Create a database pool
const pool = new Pool({
  hostname: 'db.mkbyoxzrcbtplxmxhpce.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: dbPassword,
  tls: {
    enabled: true,
  },
}, 3);

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
  const client = await pool.connect();
  try {
    const { members } = await fetchFromCongressApi('/member', {
      congress: 118,
      chamber,
      limit: 250,
    });

    for (const member of members) {
      const nameParts = member.name.split(',');
      const lastName = nameParts[0].trim();
      const firstName = nameParts[1]?.split(' ')[1]?.trim() || '';

      await client.queryObject`
        INSERT INTO api.politicians (
          name, state, chamber, party, photo_url, description, role_title, serving_since
        ) VALUES (
          ${`${firstName} ${lastName}`},
          ${member.state},
          ${chamber.toLowerCase()},
          ${member.partyName === 'Democratic' ? 'D' : member.partyName === 'Republican' ? 'R' : 'I'},
          ${member.depiction?.imageUrl || null},
          ${chamber === 'SENATE' 
            ? `Senator from ${member.state}`
            : `Representative from ${member.state}${member.district ? `, District ${member.district}` : ''}`},
          ${chamber === 'SENATE' ? 'Senator' : 'Representative'},
          ${`${member.terms.item[0].startYear}-01-01`}
        )
        ON CONFLICT (name, state, chamber)
        DO UPDATE SET
          party = EXCLUDED.party,
          photo_url = EXCLUDED.photo_url,
          description = EXCLUDED.description,
          role_title = EXCLUDED.role_title,
          serving_since = EXCLUDED.serving_since,
          updated_at = CURRENT_TIMESTAMP
      `;
    }
  } finally {
    client.release();
  }
}

async function syncVotes(chamber: 'SENATE' | 'HOUSE') {
  const client = await pool.connect();
  try {
    const { votes } = await fetchFromCongressApi(`/congress/118/roll-call-votes/${chamber}`, {
      limit: 250,
    });

    for (const vote of votes) {
      const voteDetails = await fetchFromCongressApi(
        `/congress/118/roll-call-votes/${chamber}/${vote.voteNumber}`
      );

      if (voteDetails.bill) {
        // Insert or update bill
        const billResult = await client.queryObject`
          INSERT INTO api.bills (
            congress_id, congress, title, summary, introduced_date, status
          ) VALUES (
            ${`${voteDetails.bill.congress}${voteDetails.bill.type}${voteDetails.bill.number}`},
            ${voteDetails.bill.congress},
            ${voteDetails.bill.title},
            ${voteDetails.bill.summary || null},
            ${voteDetails.bill.introducedDate},
            ${voteDetails.bill.status}
          )
          ON CONFLICT (congress_id)
          DO UPDATE SET
            title = EXCLUDED.title,
            summary = EXCLUDED.summary,
            status = EXCLUDED.status,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id
        `;

        const billId = billResult.rows[0].id;

        // Insert or update voting records
        for (const position of voteDetails.positions) {
          await client.queryObject`
            INSERT INTO api.voting_records (
              politician_id, bill_id, vote, vote_date
            ) VALUES (
              ${position.memberId},
              ${billId},
              ${position.vote},
              ${voteDetails.date}
            )
            ON CONFLICT (politician_id, bill_id)
            DO UPDATE SET
              vote = EXCLUDED.vote,
              vote_date = EXCLUDED.vote_date,
              updated_at = CURRENT_TIMESTAMP
          `;
        }
      }
    }
  } finally {
    client.release();
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
  } finally {
    // Close all database connections
    await pool.end();
  }
}); 