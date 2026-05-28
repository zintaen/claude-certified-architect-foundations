const fs = require('fs');

const SUPABASE_URL = "https://idtmcfqcgvecrivvtsxv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdG1jZnFjZ3ZlY3JpdnZ0c3h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjYwNjAsImV4cCI6MjA5NTM0MjA2MH0.SBB3j0xIjJt4hp9PzD0tX4VOd2vY5gIu6BddspVVFn4";

async function syncToSupabase() {
  console.log("Loading questions_backup.json...");
  const data = JSON.parse(fs.readFileSync("questions_backup.json", "utf-8"));
  
  console.log(`Found ${data.length} questions to sync.`);

  const response = await fetch(`${SUPABASE_URL}/rest/v1/questions`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Failed to sync to Supabase:", response.status, err);
  } else {
    console.log("Successfully synced all questions to Supabase!");
  }
}

syncToSupabase().catch(console.error);
