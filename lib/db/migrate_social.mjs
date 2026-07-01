import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.zpwexwsxwkwajayrbljt:Billowria%409984@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text;
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" text;
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_profile_public" boolean DEFAULT true;

      CREATE TABLE IF NOT EXISTS "friendships" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "requester_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "addressee_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "status" text NOT NULL DEFAULT 'pending',
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "friendships_requester_addressee_unique" UNIQUE("requester_id", "addressee_id")
      );

      CREATE INDEX IF NOT EXISTS "idx_friendships_requester" ON "friendships"("requester_id");
      CREATE INDEX IF NOT EXISTS "idx_friendships_addressee" ON "friendships"("addressee_id");
      CREATE INDEX IF NOT EXISTS "idx_friendships_status" ON "friendships"("status");
    `);
    console.log('✅ Migration applied successfully');
    
    // Verify
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('avatar_url', 'bio', 'is_profile_public')
      ORDER BY column_name;
    `);
    console.log('Users new columns:', result.rows.map(r => r.column_name));
    
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'friendships' AND table_schema = 'public';
    `);
    console.log('Friendships table exists:', tables.rows.length > 0);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
