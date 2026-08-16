import EmbeddedPostgres from 'embedded-postgres';

const database = new EmbeddedPostgres({
  databaseDir: './var/postgres',
  user: 'postgres',
  password: 'postgres',
  port: 5432,
  persistent: true,
  onLog: (message) => console.log(`[postgres] ${message}`),
  onError: (message) => console.error(`[postgres] ${message}`),
});

try {
  await database.initialise();
} catch (error) {
  if (!String(error).toLowerCase().includes('already')) throw error;
}

await database.start();
try {
  await database.createDatabase('ai_image_template');
} catch (error) {
  if (!String(error).toLowerCase().includes('already exists')) throw error;
}

console.log('[postgres] ready on 127.0.0.1:5432');

const stop = async () => {
  await database.stop();
  process.exit(0);
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
await new Promise(() => {});
