import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error("Error listing buckets:", listError);
    process.exit(1);
  }

  const avatarsExists = buckets.find(b => b.name === 'avatars');
  
  if (avatarsExists) {
    console.log("Bucket 'avatars' already exists.");
  } else {
    const { data, error } = await supabase.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    });
    
    if (error) {
      console.error("Error creating bucket:", error);
    } else {
      console.log("Bucket 'avatars' created successfully:", data);
    }
  }
}

setupStorage();
