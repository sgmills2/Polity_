import dotenv from 'dotenv';

dotenv.config();

async function debugCongressApi() {
  console.log('🔍 Debugging Congress API responses...');
  
  const congressApiKey = process.env.CONGRESS_API_KEY;
  if (!congressApiKey) {
    console.error('❌ CONGRESS_API_KEY not found');
    return;
  }

  console.log('✅ Congress API key found');

  try {
    // Test without chamber parameter to see all members
    console.log('\n🌍 Testing without chamber parameter (all members)...');
    const allUrl = new URL('https://api.congress.gov/v3/member');
    allUrl.searchParams.append('api_key', congressApiKey);
    allUrl.searchParams.append('format', 'json');
    allUrl.searchParams.append('congress', '118');
    allUrl.searchParams.append('limit', '20'); // Small limit for testing

    const allResponse = await fetch(allUrl.toString());
    console.log(`All Members Response Status: ${allResponse.status}`);
    
    if (allResponse.ok) {
      const allData = await allResponse.json();
      console.log(`Total Members Found: ${allData.members?.length || 0}`);
      
      if (allData.members?.length > 0) {
        console.log('\nFirst 10 members (with chamber info):');
        allData.members.slice(0, 10).forEach((member: any, i: number) => {
          const latestTerm = member.terms?.item?.[0];
          const chamber = latestTerm?.chamber || 'Unknown';
          console.log(`  ${i + 1}. ${member.name} (${member.state}-${member.partyName})`);
          console.log(`     Chamber: ${chamber}`);
          console.log(`     Terms: ${member.terms?.item?.length || 0} terms`);
        });
      }
    }

    // Test specific Senate endpoint with different parameter format
    console.log('\n📊 Testing Senate with currentMember=true...');
    const senateUrl2 = new URL('https://api.congress.gov/v3/member');
    senateUrl2.searchParams.append('api_key', congressApiKey);
    senateUrl2.searchParams.append('format', 'json');
    senateUrl2.searchParams.append('congress', '118');
    senateUrl2.searchParams.append('chamber', 'senate'); // lowercase
    senateUrl2.searchParams.append('currentMember', 'true');
    senateUrl2.searchParams.append('limit', '250');

    const senateResponse2 = await fetch(senateUrl2.toString());
    console.log(`Senate (lowercase) Response Status: ${senateResponse2.status}`);
    
    if (senateResponse2.ok) {
      const senateData2 = await senateResponse2.json();
      console.log(`Senate Members (lowercase): ${senateData2.members?.length || 0}`);
    }

    // Try the /member/congress/{congress}/house endpoint format
    console.log('\n🏛️ Testing alternative House endpoint format...');
    const houseUrl2 = new URL('https://api.congress.gov/v3/member/congress/118/house');
    houseUrl2.searchParams.append('api_key', congressApiKey);
    houseUrl2.searchParams.append('format', 'json');
    houseUrl2.searchParams.append('limit', '250');

    const houseResponse2 = await fetch(houseUrl2.toString());
    console.log(`House (alternative format) Response Status: ${houseResponse2.status}`);
    
    if (houseResponse2.ok) {
      const houseData2 = await houseResponse2.json();
      console.log(`House Members (alternative): ${houseData2.members?.length || 0}`);
      
      if (houseData2.members?.length > 0) {
        console.log('First 5 House members (alternative):');
        houseData2.members.slice(0, 5).forEach((member: any, i: number) => {
          console.log(`  ${i + 1}. ${member.name} (${member.state}-${member.partyName})`);
        });
      }
    }

    // Try the /member/congress/{congress}/senate endpoint format
    console.log('\n📊 Testing alternative Senate endpoint format...');
    const senateUrl3 = new URL('https://api.congress.gov/v3/member/congress/118/senate');
    senateUrl3.searchParams.append('api_key', congressApiKey);
    senateUrl3.searchParams.append('format', 'json');
    senateUrl3.searchParams.append('limit', '250');

    const senateResponse3 = await fetch(senateUrl3.toString());
    console.log(`Senate (alternative format) Response Status: ${senateResponse3.status}`);
    
    if (senateResponse3.ok) {
      const senateData3 = await senateResponse3.json();
      console.log(`Senate Members (alternative): ${senateData3.members?.length || 0}`);
      
      if (senateData3.members?.length > 0) {
        console.log('First 5 Senate members (alternative):');
        senateData3.members.slice(0, 5).forEach((member: any, i: number) => {
          console.log(`  ${i + 1}. ${member.name} (${member.state}-${member.partyName})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugCongressApi(); 