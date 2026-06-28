import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres.zpwexwsxwkwajayrbljt:Billowria%409984@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'
});
await client.connect();
const res = await client.query('SELECT id, active_program_ids FROM users ORDER BY created_at DESC LIMIT 1;');
console.log(JSON.stringify(res.rows, null, 2));
await client.end();
