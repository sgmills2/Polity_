import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

async function exploreHouseClerkAPI() {
  console.log('🔍 Exploring House Clerk API endpoints...\n');

  const testYears = [2022, 2021, 2020, 2019, 2018];
  
  for (const year of testYears) {
    try {
      console.log(`📅 Testing ${year}...`);
      
      // Test the index endpoint
      const url = `http://clerk.house.gov/evs/${year}/index.xml`;
      console.log(`   Testing: ${url}`);
      
      const response = await axios.get(url, { 
        timeout: 10000,
        validateStatus: function (status) {
          return status < 500; // Resolve only if the status code is less than 500
        }
      });
      
      if (response.status === 200) {
        console.log(`   ✅ ${year}: SUCCESS - Found data (${response.data.length} bytes)`);
        
        // Try to extract some info from the XML
        const xmlContent = response.data.toString();
        const rollCallMatches = xmlContent.match(/<rollcall/g);
        const rollCallCount = rollCallMatches ? rollCallMatches.length : 0;
        console.log(`   📊 Estimated roll calls: ${rollCallCount}`);
        
        // Show first few lines of XML for structure
        const firstLines = xmlContent.split('\n').slice(0, 5).join('\n');
        console.log(`   📄 XML structure preview:\n${firstLines}...`);
        
        break; // Found working year, stop testing
      } else {
        console.log(`   ❌ ${year}: ${response.status} - ${response.statusText}`);
      }
      
    } catch (error: any) {
      if (error.response) {
        console.log(`   ❌ ${year}: ${error.response.status} - ${error.response.statusText}`);
      } else {
        console.log(`   ❌ ${year}: ${error.message}`);
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n🌐 Alternative endpoints to try:');
  console.log('1. https://clerk.house.gov/Votes (main voting page)');
  console.log('2. https://clerk.house.gov/evs/ (electronic voting system)');
  console.log('3. https://www.govinfo.gov/app/collection/crec/ (Congressional Record)');
  
  console.log('\n💡 If House Clerk API is unavailable, we have these alternatives:');
  console.log('✅ Congress.gov API (currently working) - politician data');
  console.log('✅ GovInfo API (with API key) - comprehensive bill data');
  console.log('📋 ProPublica Congress API - voting records');
  console.log('📋 VoteSmart API - political positions');
}

// Run the exploration
if (require.main === module) {
  exploreHouseClerkAPI()
    .then(() => {
      console.log('\n✅ House Clerk API exploration complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Exploration failed:', error);
      process.exit(1);
    });
}

export { exploreHouseClerkAPI }; 