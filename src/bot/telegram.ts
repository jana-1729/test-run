import { Bot } from 'grammy';
import { env } from '../config/env.js';
import { adminGuard } from '../middleware/admin.middleware.js';
import { logger } from '../utils/logger.js';
import { AdminHandler } from './handlers/admin.handler.js';
import { ChannelHandler } from './handlers/channel.handler.js';

export function createTelegramBot(token: string = env.BOT_TOKEN): Bot {
  const bot = new Bot(token);

  // Error handling
  bot.catch((err) => {
    logger.error(
      {
        updateId: err.ctx?.update?.update_id,
        error: err.error instanceof Error ? err.error.message : String(err.error),
      },
      'Unhandled error in grammY update processing'
    );
  });

  // Global update logger for debugging
  bot.use(async (ctx, next) => {
    const chatId = ctx.chat?.id;
    const chatType = ctx.chat?.type;
    const updateType = ctx.channelPost ? 'channel_post' : ctx.message ? 'message' : 'other';
    logger.info({ chatId, chatType, updateType }, 'Incoming Telegram update');
    await next();
  });

  // 1. Channel / Group post listener (Incoming brides from Channel A)
  bot.on(['channel_post', 'message'], async (ctx, next) => {
    const chatIdStr = ctx.chat?.id?.toString();
    if (chatIdStr === env.SOURCE_CHANNEL_ID) {
      await ChannelHandler.handleChannelPost(ctx);
      return;
    }
    await next();
  });

  // 2. Admin commands guarded by adminGuard middleware
  const admin = bot.use(adminGuard);

  admin.command('start', AdminHandler.handleStart);
  admin.command('help', AdminHandler.handleHelp);
  admin.command('setgroom', AdminHandler.handleSetGroom);
  admin.command('replacegroom', AdminHandler.handleReplaceGroom);
  admin.command('groom', AdminHandler.handleGetGroom);
  admin.command('groomstatus', AdminHandler.handleGroomStatus);
  admin.command('groomhistory', AdminHandler.handleGroomHistory);
  admin.command('stats', AdminHandler.handleStats);
  admin.command('review', AdminHandler.handleReview);
  admin.command('rules', AdminHandler.handleRules);
  admin.command('health', AdminHandler.handleHealth);

  // Commands with arguments
  admin.hears(/^\/result(\s+.+)?$/, AdminHandler.handleResult);
  admin.hears(/^\/retry(\s+.+)?$/, AdminHandler.handleRetry);

  // Admin file / photo uploads (for /setgroom)
  admin.on(['message:photo', 'message:document'], AdminHandler.handleAdminPhotoUpload);

  return bot;
}
