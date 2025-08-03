import { supabase } from '../config/supabase';

async function cleanDuplicates() {
  console.log('🧹 Starting duplicate cleanup...');

  try {
    // First, let's see what duplicates we have using raw SQL
    const { error: dupError } = await supabase
      .rpc('find_duplicate_politicians');

    if (dupError) {
      console.log('RPC not available, using alternative approach...');
      
      // Get all politicians and find duplicates manually
      const { data: allPoliticians, error: allError } = await supabase
        .from('politicians')
        .select('*')
        .order('name, created_at');

      if (allError) {
        console.error('Error fetching all politicians:', allError);
        return;
      }

      console.log(`\n📊 Current politician counts:`);
      const counts = (allPoliticians || []).reduce((acc: any, pol: any) => {
        acc[pol.chamber] = (acc[pol.chamber] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(counts).forEach(([chamber, count]) => {
        console.log(`  • ${chamber}: ${count} politicians`);
      });

      const total = Object.values(counts).reduce((sum: any, count: any) => sum + count, 0);
      console.log(`  • Total: ${total} politicians`);

      // Find and remove duplicates
      const seen = new Map<string, any>();
      const toDelete: string[] = [];

      for (const politician of allPoliticians || []) {
        const key = `${politician.name}-${politician.state}-${politician.chamber}`;
        
        if (seen.has(key)) {
          // This is a duplicate - prefer the one with congress_id
          const existing = seen.get(key);
          if (politician.congress_id && !existing.congress_id) {
            // Current politician has congress_id, delete the existing one
            toDelete.push(existing.id);
            seen.set(key, politician);
            console.log(`  🔄 Replacing duplicate: ${politician.name} (${politician.state}) - keeping newer record`);
          } else {
            // Keep existing, delete current
            toDelete.push(politician.id);
            console.log(`  🗑️  Marking duplicate for deletion: ${politician.name} (${politician.state})`);
          }
        } else {
          seen.set(key, politician);
        }
      }

      if (toDelete.length > 0) {
        console.log(`\nDeleting ${toDelete.length} duplicate records...`);
        
        const { error: deleteError } = await supabase
          .from('politicians')
          .delete()
          .in('id', toDelete);

        if (deleteError) {
          console.error('Error deleting duplicates:', deleteError);
        } else {
          console.log('✅ Duplicates deleted successfully!');
        }
      } else {
        console.log('\n✅ No duplicates found!');
      }

      // Check final counts
      const { data: finalPoliticians, error: finalError } = await supabase
        .from('politicians')
        .select('chamber');

      if (finalError) {
        console.error('Error getting final counts:', finalError);
      } else {
        const finalCounts = (finalPoliticians || []).reduce((acc: any, pol: any) => {
          acc[pol.chamber] = (acc[pol.chamber] || 0) + 1;
          return acc;
        }, {});
        
        console.log('\n📊 Final politician counts:');
        Object.entries(finalCounts).forEach(([chamber, count]) => {
          console.log(`  • ${chamber}: ${count} politicians`);
        });
        
        const finalTotal = Object.values(finalCounts).reduce((sum: number, count: any) => sum + (count as number), 0);
        console.log(`  • Total: ${finalTotal} politicians`);
        
        // Expected counts for 118th Congress
        console.log('\n🎯 Expected counts for 118th Congress:');
        console.log('  • Senate: 100 (2 per state)');
        console.log('  • House: 435 representatives');
        console.log('  • Total Expected: 535');
        
        if (finalTotal < 500) {
          console.log('\n⚠️  Count seems low. You may want to run a fresh sync.');
        } else if (finalTotal > 540) {
          console.log('\n⚠️  Count seems high. There may still be duplicates.');
        } else {
          console.log('\n✅ Count looks reasonable for current Congress!');
        }
      }
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

cleanDuplicates(); 