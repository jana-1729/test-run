import mongoose, { Document, Schema } from 'mongoose';

export type JobType = 'PROCESS_BRIDE_IMAGE' | 'PROCESS_GROOM_IMAGE';
export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface IJob extends Document {
  type: JobType;
  status: JobStatus;
  payload: Record<string, unknown>;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  lockedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    type: { type: String, enum: ['PROCESS_BRIDE_IMAGE', 'PROCESS_GROOM_IMAGE'], required: true },
    status: {
      type: String,
      enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'QUEUED',
      index: true,
    },
    payload: { type: Schema.Types.Mixed, required: true },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    lastError: { type: String },
    lockedAt: { type: Date },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

JobSchema.index({ status: 1, createdAt: 1 });

export const Job = mongoose.model<IJob>('Job', JobSchema, 'processing_jobs');
