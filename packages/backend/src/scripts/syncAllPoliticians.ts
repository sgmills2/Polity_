import dotenv from 'dotenv';
import { enhancedSyncService } from '../services/enhancedSync';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🚀 Federal Legislator Sync Tool');
  console.log('===============================\n');

  try {
    // Check if API key is configured
    if (!process.env.CONGRESS_API_KEY) {
      console.error('❌ CONGRESS_API_KEY environment variable is required');
      console.log('\n💡 Setup Instructions:');
      console.log('1. Get a free API key from https://api.congress.gov/sign-up/');
      console.log('2. Add CONGRESS_API_KEY=your_key_here to your .env file');
      console.log('3. Re-run this script');
      process.exit(1);
    }

    // Check current status first
    console.log('📊 Checking current database status...\n');
    const status = await enhancedSyncService.checkCurrentStatus();

    // Ask if user wants to proceed with sync
    if (status.currentMembers >= 535) {
      console.log('\n🎯 Your database already has all federal legislators!');
      console.log('✅ No sync needed unless you want to refresh the data.');
    } else {
      console.log('\n🔄 Proceeding with sync to ensure all legislators are current...\n');
    }

    // Run comprehensive sync
    const result = await enhancedSyncService.syncAllCurrentLegislators();

    // Display final results
    console.log('\n📈 Final Results Summary:');
    console.log('========================');
    console.log(`✅ Success: ${result.success ? 'YES' : 'NO'}`);
    console.log(`🏠 House Representatives: ${result.houseMembers}`);
    console.log(`🏛️ Senators: ${result.senateMembers}`);
    console.log(`📊 Total Federal Legislators: ${result.totalMembers}`);
    
    if (result.duplicates > 0) {
      console.log(`⏭️ Duplicates (already existed): ${result.duplicates}`);
    }
    
    if (result.cleaned > 0) {
      console.log(`🧹 Inactive members cleaned up: ${result.cleaned}`);
    }
    
    if (result.errors > 0) {
      console.log(`❌ Errors: ${result.errors}`);
    }

    // Provide next steps
    console.log('\n🎯 Next Steps:');
    if (result.success && result.totalMembers >= 535) {
      console.log('✅ Perfect! Your website now has all current federal legislators.');
      console.log('📊 Your political spectrum can use real, up-to-date politician data.');
      console.log('🗳️ Consider implementing real voting record analysis next.');
    } else if (result.totalMembers >= 500) {
      console.log('✅ Great! Most federal legislators are synced.');
      console.log('🔄 You can re-run this script to try to get any missing members.');
    } else {
      console.log('⚠️ Fewer legislators than expected were synced.');
      console.log('🔧 Check your internet connection and API key.');
      console.log('🔄 Try running the script again.');
    }

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Fatal error during sync:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your CONGRESS_API_KEY is valid');
    console.log('2. Verify internet connection');
    console.log('3. Check Supabase database connection');
    console.log('4. Try running the script again');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️ Sync interrupted by user. Exiting...');
  process.exit(130);
});

// Run the script
if (require.main === module) {
  main();
}

export { main as syncAllPoliticians }; 