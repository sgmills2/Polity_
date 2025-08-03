import { supabase } from '../config/supabase';

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');

  try {
    // Check if new tables exist
    console.log('📋 Checking for new tables...');
    
    const tables = ['topics', 'bills', 'voting_records', 'political_scores'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          console.log(`❌ Table '${table}' not found or error:`, error.message);
        } else {
          console.log(`✅ Table '${table}' exists (${data?.length || 0} records found)`);
        }
      } catch (err) {
        console.log(`❌ Table '${table}' not accessible:`, err);
      }
    }

    // Check if congress_id column exists in politicians
    console.log('\n👥 Checking politicians table...');
    const { data: politicians, error } = await supabase
      .from('politicians')
      .select('id, name, congress_id')
      .limit(3);

    if (error) {
      console.log('❌ Error accessing politicians:', error.message);
    } else {
      console.log(`✅ Found ${politicians?.length || 0} politicians`);
      if (politicians && politicians.length > 0) {
        console.log('First politician example:');
        console.log(politicians[0]);
      }
    }

    // Check if topics are loaded
    console.log('\n🏷️ Checking topics...');
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('*');

    if (topicsError) {
      console.log('❌ Error accessing topics:', topicsError.message);
    } else {
      console.log(`✅ Found ${topics?.length || 0} topics:`);
      topics?.forEach(topic => {
        console.log(`  • ${topic.name} (${topic.category})`);
      });
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

checkSchema(); 