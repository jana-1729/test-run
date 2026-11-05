import { createApp } from './app.js';
import { createTelegramBot } from './bot/telegram.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
import { BackgroundWorker } from './queue/worker.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  logger.info({ nodeEnv: env.NODE_ENV, port: env.PORT }, 'Starting Jathagam Matcher Bot service...');

  // 1. Connect to Database
  try {
    await connectDatabase(env.MONGODB_URI);
  } catch (err) {
    logger.fatal({ err }, 'Failed to connect to database on startup. Exiting.');
    process.exit(1);
  }

  // 2. Initialize Telegram Bot
  const bot = createTelegramBot();

  // 3. Initialize & Start Background Worker
  const worker = new BackgroundWorker(bot);
  worker.start();

  // 4. Initialize Express App
  const app = createApp(bot);
  const server = app.listen(env.PORT, () => {
    logger.info(`HTTP server listening on port ${env.PORT}`);
  });

  // 5. Setup Telegram Update Ingestion (Webhook vs Long Polling)
  if (env.USE_WEBHOOK && env.WEBHOOK_DOMAIN) {
    const webhookUrl = `${env.WEBHOOK_DOMAIN.replace(/\/$/, '')}/webhook/telegram`;
    try {
      logger.info({ webhookUrl }, 'Registering Telegram webhook...');
      await bot.api.setWebhook(webhookUrl, {
        secret_token: env.TELEGRAM_WEBHOOK_SECRET,
        allowed_updates: ['message', 'channel_post', 'edited_channel_post'],
      });
      logger.info('Telegram webhook successfully set');
    } catch (err) {
      logger.error({ err }, 'Failed to set Telegram webhook');
    }
  } else if (!env.USE_WEBHOOK && env.NODE_ENV !== 'test') {
    logger.info('Starting bot with long polling (local development mode)...');
    bot.start({
      allowed_updates: ['message', 'channel_post', 'edited_channel_post'],
      onStart: (botInfo) => {
        logger.info({ botUsername: botInfo.username }, 'Bot long polling active and ready');
      },
    });
  }

  // 6. Graceful Shutdown Handlers
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal. Closing gracefully...');

    worker.stop();

    if (!env.USE_WEBHOOK) {
      await bot.stop().catch(() => {});
    }

    server.close(() => {
      logger.info('HTTP server closed');
    });

    await disconnectDatabase();
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Fatal error during bootstrap');
  process.exit(1);
});
