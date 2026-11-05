import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-telegram-bot-api-secret-token"]',
      'botToken',
      'apiKey',
      'geminiApiKey',
      'token',
    ],
    remove: true,
  },
});
