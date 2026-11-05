import express, { Express, Request, Response } from 'express';
import { Bot, webhookCallback } from 'grammy';
import { env } from './config/env.js';
import { isDbConnected } from './database/connection.js';
import { GroomProfile } from './database/models/groom-profile.model.js';
import { webhookSecurityMiddleware } from './middleware/webhook-security.middleware.js';
import { logger } from './utils/logger.js';

export function createApp(bot: Bot): Express {
  const app = express();

  // Basic middleware
  app.use(express.json());

  // Health check endpoint
  app.get('/health', async (_req: Request, res: Response) => {
    try {
      const dbConnected = isDbConnected();
      const activeGroom = dbConnected ? await GroomProfile.getActiveProfile() : null;

      const status = dbConnected ? 'ok' : 'degraded';
      res.status(dbConnected ? 200 : 503).json({
        status,
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: {
          connected: dbConnected,
        },
        groomProfile: {
          configured: !!activeGroom,
          version: activeGroom?.version,
        },
      });
    } catch (err: unknown) {
      logger.error({ err }, 'Error in health check endpoint');
      res.status(500).json({ status: 'error', message: 'Health check failure' });
    }
  });

  // Telegram webhook endpoint (only mounted when in webhook mode)
  if (env.USE_WEBHOOK) {
    app.post(
      '/webhook/telegram',
      webhookSecurityMiddleware,
      webhookCallback(bot, 'express', {
        timeoutMilliseconds: 10000,
      })
    );
  } else {
    app.post('/webhook/telegram', (_req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', message: 'Bot running in polling mode' });
    });
  }

  // Fallback 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  return app;
}
