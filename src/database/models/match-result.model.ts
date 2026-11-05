import mongoose, { Document, Schema } from 'mongoose';
import { RuleResult, RuleStatus } from '../../matching/result.types.js';

export interface IMatchResult extends Document {
  groomProfileId?: mongoose.Types.ObjectId;
  groomProfileVersion: number;
  brideProfileId: mongoose.Types.ObjectId;
  overallStatus: RuleStatus;
  ruleResults: RuleResult[];
  reasons: string[];
  extractionConfidence: number;
  sourceChannelId: string;
  sourceMessageId: number;
  destinationChannelId?: string;
  destinationMessageId?: number;
  forwarded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MatchResultSchema = new Schema<IMatchResult>(
  {
    groomProfileId: { type: Schema.Types.ObjectId, ref: 'GroomProfile' },
    groomProfileVersion: { type: Number, required: true },
    brideProfileId: { type: Schema.Types.ObjectId, ref: 'BrideProfile', required: true },
    overallStatus: {
      type: String,
      enum: ['PASS', 'FAIL', 'REVIEW'],
      required: true,
      index: true,
    },
    ruleResults: [Schema.Types.Mixed],
    reasons: { type: [String], default: [] },
    extractionConfidence: { type: Number, default: 1.0 },
    sourceChannelId: { type: String, required: true },
    sourceMessageId: { type: Number, required: true },
    destinationChannelId: { type: String },
    destinationMessageId: { type: Number },
    forwarded: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
  }
);

MatchResultSchema.index({ sourceChannelId: 1, sourceMessageId: 1 });

export const MatchResult = mongoose.model<IMatchResult>(
  'MatchResult',
  MatchResultSchema,
  'match_results'
);
