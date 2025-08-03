import dotenv from 'dotenv';

dotenv.config();

async function checkApiPagination() {
  console.log('🔍 Checking Congress API pagination...');
  
  const congressApiKey = process.env.CONGRESS_API_KEY;
  if (!congressApiKey) {
    console.error('❌ CONGRESS_API_KEY not found');
    return;
  }

  try {
    // Test Senate pagination
    console.log('\n📊 Testing Senate pagination...');
    for (let offset = 0; offset <= 200; offset += 50) {
      const senateUrl = new URL('https://api.congress.gov/v3/member');
      senateUrl.searchParams.append('api_key', congressApiKey);
      senateUrl.searchParams.append('format', 'json');
      senateUrl.searchParams.append('congress', '118');
      senateUrl.searchParams.append('chamber', 'senate');
      senateUrl.searchParams.append('currentMember', 'true');
      senateUrl.searchParams.append('limit', '50');
      senateUrl.searchParams.append('offset', offset.toString());

      const response = await fetch(senateUrl.toString());
      if (response.ok) {
        const data = await response.json();
        console.log(`Offset ${offset}: ${data.members?.length || 0} senators`);
        
        if (data.members?.length === 0) {
          console.log('No more senators found, stopping pagination');
          break;
        }
        
        // Show pagination info if available
        if (data.pagination) {
          console.log(`  Pagination:`, data.pagination);
        }
      } else {
        console.log(`Offset ${offset}: Error ${response.status}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Test House pagination
    console.log('\n🏛️ Testing House pagination...');
    for (let offset = 0; offset <= 500; offset += 100) {
      const houseUrl = new URL('https://api.congress.gov/v3/member');
      houseUrl.searchParams.append('api_key', congressApiKey);
      houseUrl.searchParams.append('format', 'json');
      houseUrl.searchParams.append('congress', '118');
      houseUrl.searchParams.append('chamber', 'house');
      houseUrl.searchParams.append('currentMember', 'true');
      houseUrl.searchParams.append('limit', '100');
      houseUrl.searchParams.append('offset', offset.toString());

      const response = await fetch(houseUrl.toString());
      if (response.ok) {
        const data = await response.json();
        console.log(`Offset ${offset}: ${data.members?.length || 0} representatives`);
        
        if (data.members?.length === 0) {
          console.log('No more representatives found, stopping pagination');
          break;
        }
        
        // Show pagination info if available
        if (data.pagination) {
          console.log(`  Pagination:`, data.pagination);
        }
      } else {
        console.log(`Offset ${offset}: Error ${response.status}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Test without currentMember filter
    console.log('\n🌍 Testing without currentMember filter...');
    const allUrl = new URL('https://api.congress.gov/v3/member');
    allUrl.searchParams.append('api_key', congressApiKey);
    allUrl.searchParams.append('format', 'json');
    allUrl.searchParams.append('congress', '118');
    allUrl.searchParams.append('chamber', 'senate');
    allUrl.searchParams.append('limit', '250');

    const allResponse = await fetch(allUrl.toString());
    if (allResponse.ok) {
      const allData = await allResponse.json();
      console.log(`All Senate members (no currentMember filter): ${allData.members?.length || 0}`);
      
      if (allData.members?.length > 0) {
        // Check chamber distribution
        const chambers = allData.members.reduce((acc: any, member: any) => {
          const chamber = member.terms?.item?.[0]?.chamber;
          if (chamber === 'Senate') acc.senate++;
          else if (chamber === 'House of Representatives') acc.house++;
          else acc.unknown++;
          return acc;
        }, { senate: 0, house: 0, unknown: 0 });
        
        console.log('Chamber distribution:', chambers);
      }
    }

  } catch (error) {
    console.error('❌ Pagination check failed:', error);
  }
}

checkApiPagination(); 