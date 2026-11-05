import { Context, NextFunction } from 'grammy';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware ensuring only authorized administrator Telegram user IDs
 * can execute administrative commands.
 */
export async function adminGuard(ctx: Context, next: NextFunction): Promise<void> {
  // Reject if it's a channel post trying to call an admin command
  if (ctx.channelPost) {
    logger.warn(
      { channelId: ctx.channelPost.chat.id },
      'Blocked attempt to invoke admin command from a channel post'
    );
    return;
  }

  const userId = ctx.from?.id;
  if (!userId || !env.ADMIN_TELEGRAM_IDS.includes(userId)) {
    logger.warn({ userId }, 'Unauthorized attempt to access admin command');
    await ctx.reply('⛔ *Access Denied:* You are not authorized to execute administrative commands on this bot.', {
      parse_mode: 'Markdown',
    });
    return;
  }

  await next();
}
