import pkg from 'pg';
const { Client } = pkg;

async function dropAll() {
  const client = new Client({ connectionString: 'postgresql://postgres:Billowria@9984@db.zpwexwsxwkwajayrbljt.supabase.co:5432/postgres' });
  await client.connect();
  console.log("Dropping all tables...");
  await client.query(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO postgres;
    GRANT ALL ON SCHEMA public TO public;
  `);
  console.log("Done");
  await client.end();
}
dropAll().catch(console.error);
