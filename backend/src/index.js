import 'dotenv/config';
import { createApp } from './app.js';
import { initFirebase } from './config/firebase.js';
import { initMongo } from './config/mongo.js';
import { getDatabaseMode, needsFirebaseInit, needsMongoInit } from './config/databaseMode.js';
import { startReminderJob } from './jobs/reminderJob.js';
import { logger } from './utils/logger.js';
import { ensureBootstrapAdmin } from './bootstrapAdmin.js';

const port = Number(process.env.PORT) || 3001;

async function bootstrap() {
  const mode = getDatabaseMode();
  logger.info('database_mode', mode);

  if (needsFirebaseInit()) {
    try {
      initFirebase();
    } catch (e) {
      logger.error('firebase_init_failed', { message: e.message });
      process.exit(1);
    }
  }

  if (needsMongoInit()) {
    try {
      await initMongo();
    } catch (e) {
      logger.error('mongo_init_failed', { message: e.message });
      process.exit(1);
    }
  }

  ensureBootstrapAdmin().catch((e) => logger.error('bootstrap_admin_failed', { message: e.message }));

  startReminderJob();

  const app = createApp();
  app.listen(port, () => {
    logger.info('server_listen', { port, dbRead: mode.read, dbWrite: mode.write });
  });
}

bootstrap().catch((e) => {
  logger.error('server_bootstrap_failed', { message: e.message });
  process.exit(1);
});
