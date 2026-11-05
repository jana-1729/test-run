import mongoose, { Document, Schema } from 'mongoose';

export type MessageProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REVIEW';

export interface IProcessedMessage extends Document {
  sourceChannelId: string;
  sourceMessageId: number;
  processingStatus: MessageProcessingStatus;
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProcessedMessageSchema = new Schema<IProcessedMessage>(
  {
    sourceChannelId: { type: String, required: true },
    sourceMessageId: { type: Number, required: true },
    processingStatus: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVIEW'],
      default: 'PENDING',
      index: true,
    },
    retryCount: { type: Number, default: 0 },
    lastError: { type: String },
  },
  {
    timestamps: true,
  }
);

ProcessedMessageSchema.index({ sourceChannelId: 1, sourceMessageId: 1 }, { unique: true });

export const ProcessedMessage = mongoose.model<IProcessedMessage>(
  'ProcessedMessage',
  ProcessedMessageSchema,
  'processed_messages'
);
