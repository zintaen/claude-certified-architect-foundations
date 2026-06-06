require('dotenv').config();
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment.");
  process.exit(1);
}

const BACKUP_FILE = "questions_backup.json";

async function syncToSupabase() {
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error(`ERROR: ${BACKUP_FILE} not found. Cannot sync.`);
    process.exit(1);
  }

  console.log(`Loading ${BACKUP_FILE}...`);
  const data = JSON.parse(fs.readFileSync(BACKUP_FILE, "utf-8"));
  
  console.log(`Found ${data.length} questions to sync.`);

  // Batch insert to avoid payload size limits (batching 20 at a time)
  const batchSize = 20;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    console.log(`Syncing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.length/batchSize)}...`);
    
    // We use the global fetch (Node 18+)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/questions`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(batch)
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Failed to sync batch to Supabase:", response.status, err);
      process.exit(1);
    }
  }

  console.log("Successfully synced all questions to Supabase!");
}

syncToSupabase().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
