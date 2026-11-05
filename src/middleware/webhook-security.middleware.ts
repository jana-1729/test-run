import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Validates the Telegram Webhook Secret Token header
 * X-Telegram-Bot-Api-Secret-Token
 */
export function webhookSecurityMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If webhook secret is not set, allow in development/test
  if (env.NODE_ENV !== 'production' && !env.TELEGRAM_WEBHOOK_SECRET) {
    return next();
  }

  const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
  if (!secretHeader || secretHeader !== env.TELEGRAM_WEBHOOK_SECRET) {
    logger.warn(
      { ip: req.ip, secretProvided: !!secretHeader },
      'Rejected unauthorized webhook request: invalid or missing secret token'
    );
    res.status(403).json({ error: 'Unauthorized webhook request' });
    return;
  }

  next();
}
