import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let isConnected = false;

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  if (isConnected) {
    return mongoose;
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });

    isConnected = true;
    logger.info('Connected to MongoDB successfully');

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'MongoDB connection error');
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('MongoDB disconnected');
    });

    return mongoose;
  } catch (error) {
    logger.error({ error, uri }, 'Failed to connect to MongoDB');
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info('Disconnected from MongoDB');
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
