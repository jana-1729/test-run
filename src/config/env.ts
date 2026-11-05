import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8080),
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/jathagam_matcher'),
  SOURCE_CHANNEL_ID: z.string().min(1, 'SOURCE_CHANNEL_ID is required'),
  DESTINATION_CHANNEL_ID: z.string().min(1, 'DESTINATION_CHANNEL_ID is required'),
  ADMIN_TELEGRAM_IDS: z
    .string()
    .transform((val) =>
      val
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map(Number)
    )
    .refine((arr) => arr.length > 0 && arr.every((n) => !isNaN(n)), {
      message: 'ADMIN_TELEGRAM_IDS must be a comma-separated list of numeric Telegram user IDs',
    }),
  TELEGRAM_WEBHOOK_SECRET: z.string().default('default_webhook_secret_for_local_testing_123'),
  WEBHOOK_DOMAIN: z.string().optional(),
  USE_WEBHOOK: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  GOOGLE_CLOUD_REGION: z.string().default('us-central1'),
  TASK_QUEUE_NAME: z.string().optional(),
  MAX_IMAGE_SIZE_MB: z.coerce.number().default(15),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function parseEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    // If running in test environment and env is incomplete, provide mock defaults
    if (process.env.NODE_ENV === 'test') {
      return {
        NODE_ENV: 'test',
        PORT: 8080,
        BOT_TOKEN: '123456:mock_token_for_testing',
        GEMINI_API_KEY: 'mock_gemini_api_key',
        GEMINI_MODEL: 'gemini-2.5-flash',
        MONGODB_URI: 'mongodb://localhost:27017/jathagam_matcher_test',
        SOURCE_CHANNEL_ID: '-1001111111111',
        DESTINATION_CHANNEL_ID: '-1002222222222',
        ADMIN_TELEGRAM_IDS: [123456789, 987654321],
        TELEGRAM_WEBHOOK_SECRET: 'test_secret',
        USE_WEBHOOK: false,
        GOOGLE_CLOUD_REGION: 'us-central1',
        MAX_IMAGE_SIZE_MB: 15,
        LOG_LEVEL: 'info',
      };
    }
    const errors = result.error.issues
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }
  return result.data;
}

export const env = parseEnv();
