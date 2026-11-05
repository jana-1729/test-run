import { IJob, Job, JobType } from '../database/models/job.model.js';
import { logger } from '../utils/logger.js';

export interface BrideJobPayload {
  sourceChannelId: string;
  sourceMessageId: number;
  fileId: string;
  mediaGroupId?: string;
}

export interface GroomJobPayload {
  adminId: number;
  fileId: string;
  chatId: number;
}

export class QueueService {
  /**
   * Enqueues a bride horoscope image for background processing
   */
  public static async enqueueBrideJob(payload: BrideJobPayload): Promise<IJob> {
    const job = await Job.create({
      type: 'PROCESS_BRIDE_IMAGE' as JobType,
      status: 'QUEUED',
      payload: payload as unknown as Record<string, unknown>,
    });

    logger.info(
      {
        jobId: job._id,
        sourceChannelId: payload.sourceChannelId,
        sourceMessageId: payload.sourceMessageId,
      },
      'Enqueued bride horoscope processing job'
    );

    return job;
  }

  /**
   * Enqueues a groom horoscope image for background extraction
   */
  public static async enqueueGroomJob(payload: GroomJobPayload): Promise<IJob> {
    const job = await Job.create({
      type: 'PROCESS_GROOM_IMAGE' as JobType,
      status: 'QUEUED',
      payload: payload as unknown as Record<string, unknown>,
    });

    logger.info(
      { jobId: job._id, adminId: payload.adminId },
      'Enqueued groom horoscope processing job'
    );

    return job;
  }

  /**
   * Atomically acquires the next available queued job
   */
  public static async acquireNextJob(): Promise<IJob | null> {
    const job = await Job.findOneAndUpdate(
      {
        status: 'QUEUED',
      },
      {
        $set: {
          status: 'PROCESSING',
          lockedAt: new Date(),
        },
      },
      {
        sort: { createdAt: 1 },
        returnDocument: 'after',
      }
    ).exec();

    return job;
  }

  /**
   * Marks a job as completed
   */
  public static async markCompleted(jobId: string): Promise<void> {
    await Job.findByIdAndUpdate(jobId, {
      $set: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    }).exec();
  }

  /**
   * Marks a job as failed, with retry tracking
   */
  public static async markFailed(jobId: string, errorMsg: string): Promise<void> {
    const job = await Job.findById(jobId).exec();
    if (!job) return;

    const newRetryCount = job.retryCount + 1;
    const isExhausted = newRetryCount >= job.maxRetries;

    await Job.findByIdAndUpdate(jobId, {
      $set: {
        status: isExhausted ? 'FAILED' : 'QUEUED',
        retryCount: newRetryCount,
        lastError: errorMsg,
      },
    }).exec();

    logger.warn(
      { jobId, newRetryCount, isExhausted, errorMsg },
      'Job marked as failed'
    );
  }
}
