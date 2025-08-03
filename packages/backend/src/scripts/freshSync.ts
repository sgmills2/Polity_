import { supabase } from '../config/supabase';
import { syncPoliticians } from '../services/sync';

async function freshSync() {
  console.log('🔄 Starting fresh politician sync...');
  console.log('This will clear all existing politicians and sync fresh data from Congress.gov');

  try {
    // Step 1: Clear all existing politicians
    console.log('\n🗑️  Step 1: Clearing existing politicians...');
    const { error: deleteError } = await supabase
      .from('politicians')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using impossible ID)

    if (deleteError) {
      console.error('Error clearing politicians:', deleteError);
      return;
    }
    
    console.log('✅ All existing politicians cleared');

    // Step 2: Fresh sync from Congress API
    console.log('\n📥 Step 2: Syncing fresh data from Congress.gov...');
    const result = await syncPoliticians();

    if (result.success) {
      console.log(`✅ Fresh sync completed successfully!`);
      console.log(`   • Total synced: ${result.totalSynced} politicians`);
      
      if (result.errors.length > 0) {
        console.log(`   • Errors: ${result.errors.length}`);
        result.errors.slice(0, 5).forEach(error => console.log(`     - ${error}`));
        if (result.errors.length > 5) {
          console.log(`     ... and ${result.errors.length - 5} more errors`);
        }
      }

      // Step 3: Verify final counts
      console.log('\n📊 Step 3: Verifying final counts...');
      const { data: finalPoliticians, error: countError } = await supabase
        .from('politicians')
        .select('chamber');

      if (countError) {
        console.error('Error getting final counts:', countError);
      } else {
        const counts = (finalPoliticians || []).reduce((acc: any, pol: any) => {
          acc[pol.chamber] = (acc[pol.chamber] || 0) + 1;
          return acc;
        }, {});
        
        console.log('Final politician counts:');
        Object.entries(counts).forEach(([chamber, count]) => {
          console.log(`  • ${chamber}: ${count} politicians`);
        });
        
        const total = Object.values(counts).reduce((sum: number, count: any) => sum + (count as number), 0);
        console.log(`  • Total: ${total} politicians`);
        
        console.log('\n🎯 Expected for 118th Congress:');
        console.log('  • Senate: 100 senators');
        console.log('  • House: 435 representatives');
        console.log('  • Total Expected: 535');
        
        if (total >= 530) {
          console.log('\n🎉 Excellent! You now have complete Congress data!');
        } else if (total >= 500) {
          console.log('\n✅ Good! Most Congress members synced successfully.');
        } else {
          console.log('\n⚠️  Still seems incomplete. Check your Congress API key and rate limits.');
        }
      }
    } else {
      console.error('❌ Fresh sync failed:', result.errors);
    }

  } catch (error) {
    console.error('❌ Fresh sync failed:', error);
  }
}

freshSync(); 