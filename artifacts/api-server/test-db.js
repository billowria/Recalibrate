const { db } = require('./src/db/index.js');
const { programTasks } = require('./src/db/schema.js');
async function test() {
  try {
    const tasks = await db.select().from(programTasks).limit(5);
    console.log(tasks);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
test();
