import dotenv from 'dotenv';
import { syncPoliticians } from '../services/sync';

// Load environment variables
dotenv.config();

async function main() {
  console.log('Starting data sync...');
  
  try {
    console.log('Syncing politicians and voting records...');
    await syncPoliticians();
    console.log('Data sync completed successfully!');
  } catch (error) {
    console.error('Error during sync:', error);
    process.exit(1);
  }
}

main(); 