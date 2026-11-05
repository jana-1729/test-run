import mongoose, { Document, Model, Schema } from 'mongoose';
import { JathagamExtraction } from '../../schemas/jathagam.schema.js';

export interface IBrideProfile extends Document {
  sourceChannelId: string;
  sourceMessageId: number;
  mediaGroupId?: string;
  extractedData: JathagamExtraction;
  originalFileReference: string;
  extractionStatus: 'SUCCESS' | 'REVIEW_REQUIRED' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
}

const BrideProfileSchema = new Schema<IBrideProfile>(
  {
    sourceChannelId: { type: String, required: true },
    sourceMessageId: { type: Number, required: true },
    mediaGroupId: { type: String },
    extractedData: { type: Schema.Types.Mixed, required: true },
    originalFileReference: { type: String, required: true },
    extractionStatus: {
      type: String,
      enum: ['SUCCESS', 'REVIEW_REQUIRED', 'FAILED'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

BrideProfileSchema.index({ sourceChannelId: 1, sourceMessageId: 1 }, { unique: true });

export const BrideProfile = mongoose.model<IBrideProfile>(
  'BrideProfile',
  BrideProfileSchema,
  'bride_profiles'
);
