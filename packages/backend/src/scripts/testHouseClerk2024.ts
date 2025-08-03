import dotenv from 'dotenv';
import { houseClerkService } from '../services/houseClerkIntegration';

// Load environment variables
dotenv.config();

async function testHouseClerk2024() {
  console.log('🧪 Testing House Clerk API with 2024 data...\n');

  try {
    // Test with 2024 (should have data)
    console.log('📊 Fetching 2024 House roll call votes...');
    const votes2024 = await houseClerkService.getHouseVotesForYear(2024);
    console.log(`✅ Found ${votes2024.length} House roll call votes for 2024`);
    
    if (votes2024.length > 0) {
      console.log('📋 First 5 roll calls:', votes2024.slice(0, 5));
      
      // Get detailed info for first vote
      const firstVote = votes2024[0];
      console.log(`\n🔍 Getting details for roll call #${firstVote}...`);
      const voteDetails = await houseClerkService.getHouseRollCallVote(2024, firstVote);
      
      if (voteDetails) {
        console.log('📄 Vote Details:');
        console.log(`   Question: ${voteDetails.question}`);
        console.log(`   Date: ${voteDetails.date}`);
        console.log(`   Result: ${voteDetails.result}`);
        console.log(`   Total Members Voting: ${voteDetails.votes.length}`);
        console.log(`   Breakdown: ${voteDetails.totalYes} Yea, ${voteDetails.totalNo} Nay`);
        
        // Show sample member votes
        console.log('\n👥 Sample member votes:');
        voteDetails.votes.slice(0, 5).forEach(vote => {
          console.log(`   ${vote.member} (${vote.party}-${vote.state}): ${vote.vote}`);
        });
      }
    }

    // Also test 2023 for comparison
    console.log('\n📊 Fetching 2023 House roll call votes...');
    const votes2023 = await houseClerkService.getHouseVotesForYear(2023);
    console.log(`✅ Found ${votes2023.length} House roll call votes for 2023`);

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
if (require.main === module) {
  testHouseClerk2024()
    .then(() => {
      console.log('\n✅ House Clerk API test complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { testHouseClerk2024 }; 