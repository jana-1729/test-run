import { Bot } from 'grammy';
import { env } from '../config/env.js';
import { BrideProfile } from '../database/models/bride-profile.model.js';
import { GroomProfile } from '../database/models/groom-profile.model.js';
import { MatchResult } from '../database/models/match-result.model.js';
import { ProcessedMessage } from '../database/models/processed-message.model.js';
import { MatchingEngine } from '../matching/engine.js';
import { ExtractionService } from '../services/extraction.service.js';
import { ForwardingService } from '../services/forwarding.service.js';
import { logger } from '../utils/logger.js';
import { ReportGenerator } from '../utils/report.js';
import { BrideJobPayload, GroomJobPayload, QueueService } from './queue.service.js';

export class BackgroundWorker {
  private bot: Bot;
  private extractionService: ExtractionService;
  private matchingEngine: MatchingEngine;
  private forwardingService: ForwardingService;
  private isRunning = false;
  private pollIntervalMs = 2000;
  private pollTimer?: NodeJS.Timeout;

  constructor(
    bot: Bot,
    extractionService?: ExtractionService,
    matchingEngine?: MatchingEngine,
    forwardingService?: ForwardingService
  ) {
    this.bot = bot;
    this.extractionService = extractionService || new ExtractionService();
    this.matchingEngine = matchingEngine || new MatchingEngine();
    this.forwardingService = forwardingService || new ForwardingService(bot);
  }

  /**
   * Starts the background queue worker polling loop
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('Background worker started');
    this.poll();
  }

  /**
   * Stops the background worker gracefully
   */
  public stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }
    logger.info('Background worker stopped');
  }

  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const job = await QueueService.acquireNextJob();
      if (job) {
        logger.debug({ jobId: job._id, type: job.type }, 'Processing job');
        if (job.type === 'PROCESS_BRIDE_IMAGE') {
          await this.processBrideJob(job.payload as unknown as BrideJobPayload);
        } else if (job.type === 'PROCESS_GROOM_IMAGE') {
          await this.processGroomJob(job.payload as unknown as GroomJobPayload);
        }
        await QueueService.markCompleted(job._id.toString());
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ err }, 'Error in worker loop while processing job');
    } finally {
      if (this.isRunning) {
        this.pollTimer = setTimeout(() => this.poll(), this.pollIntervalMs);
      }
    }
  }

  /**
   * Downloads a file from Telegram API into a Buffer
   */
  public async downloadTelegramFile(fileId: string): Promise<Buffer> {
    const file = await this.bot.api.getFile(fileId);
    if (!file.file_path) {
      throw new Error(`Telegram did not return a valid file path for fileId: ${fileId}`);
    }

    const fileUrl = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.file_path}`;
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file from Telegram: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Handles processing of an incoming bride Jathagam image
   */
  public async processBrideJob(payload: BrideJobPayload): Promise<void> {
    const { sourceChannelId, sourceMessageId, fileId, mediaGroupId } = payload;
    logger.info({ sourceChannelId, sourceMessageId }, 'Starting bride Jathagam pipeline');

    // 1. Update message processing status to PROCESSING
    await ProcessedMessage.findOneAndUpdate(
      { sourceChannelId, sourceMessageId },
      { $set: { processingStatus: 'PROCESSING' }, $inc: { retryCount: 1 } },
      { upsert: true }
    ).exec();

    try {
      // 2. Fetch active groom profile
      const activeGroom = await GroomProfile.getActiveProfile();
      if (!activeGroom) {
        const errorMsg =
          'No active groom horoscope profile configured. Cannot evaluate bride compatibility.';
        logger.error(errorMsg);

        // Notify admins
        for (const adminId of env.ADMIN_TELEGRAM_IDS) {
          await this.bot.api.sendMessage(
            adminId,
            `⚠️ *ACTION REQUIRED*: A bride Jathagam arrived in channel \`${sourceChannelId}\`, but NO active groom profile is configured.\n\nPlease upload the groom Jathagam using \`/setgroom\`.`,
            { parse_mode: 'Markdown' }
          ).catch(() => {});
        }

        await ProcessedMessage.findOneAndUpdate(
          { sourceChannelId, sourceMessageId },
          { $set: { processingStatus: 'REVIEW', lastError: errorMsg } }
        ).exec();
        return;
      }

      // 3. Download original image
      const imageBuffer = await this.downloadTelegramFile(fileId);

      // 4. Extract horoscope information with Gemini & normalizer
      const { data: brideData, rawGeminiResponse } =
        await this.extractionService.processHoroscopeImage(imageBuffer);

      // 5. Store / update BrideProfile
      const extractionStatus =
        brideData.overallExtractionConfidence < 0.7 || brideData.unreadableFields.length > 0
          ? 'REVIEW_REQUIRED'
          : 'SUCCESS';

      const brideDoc = await BrideProfile.findOneAndUpdate(
        { sourceChannelId, sourceMessageId },
        {
          $set: {
            mediaGroupId,
            extractedData: brideData,
            originalFileReference: fileId,
            extractionStatus,
          },
        },
        { upsert: true, returnDocument: 'after' }
      ).exec();

      // 6. Run Matching Engine
      const decision = this.matchingEngine.evaluate(
        brideData,
        activeGroom.extractedData,
        activeGroom.version,
        activeGroom._id.toString()
      );

      // 7. Check if already forwarded (Idempotency check)
      const existingMatch = await MatchResult.findOne({
        sourceChannelId,
        sourceMessageId,
      }).exec();

      const alreadyForwarded = existingMatch ? existingMatch.forwarded : false;

      // 8. Handle Forwarding / Admin Notification
      const forwardingResult = await this.forwardingService.handleDecisionOutcome(
        decision,
        brideData,
        sourceChannelId,
        sourceMessageId,
        alreadyForwarded
      );

      // 9. Save Match Result
      await MatchResult.findOneAndUpdate(
        { sourceChannelId, sourceMessageId },
        {
          $set: {
            groomProfileId: activeGroom._id,
            groomProfileVersion: activeGroom.version,
            brideProfileId: brideDoc._id,
            overallStatus: decision.overallStatus,
            ruleResults: decision.ruleResults,
            reasons: decision.reasons,
            extractionConfidence: brideData.overallExtractionConfidence,
            destinationChannelId: env.DESTINATION_CHANNEL_ID,
            destinationMessageId: forwardingResult.destinationMessageId,
            forwarded: forwardingResult.forwarded,
          },
        },
        { upsert: true }
      ).exec();

      // 10. Update ProcessedMessage status
      const finalMsgStatus =
        decision.overallStatus === 'PASS' || decision.overallStatus === 'FAIL'
          ? 'COMPLETED'
          : 'REVIEW';

      await ProcessedMessage.findOneAndUpdate(
        { sourceChannelId, sourceMessageId },
        {
          $set: {
            processingStatus: finalMsgStatus,
          },
        }
      ).exec();

      logger.info(
        {
          sourceChannelId,
          sourceMessageId,
          overallStatus: decision.overallStatus,
          forwarded: forwardingResult.forwarded,
        },
        'Bride Jathagam pipeline execution finished successfully'
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ err, sourceChannelId, sourceMessageId }, 'Bride pipeline failed with error');

      await ProcessedMessage.findOneAndUpdate(
        { sourceChannelId, sourceMessageId },
        {
          $set: {
            processingStatus: 'FAILED',
            lastError: errorMsg,
          },
        }
      ).exec();

      throw err;
    }
  }

  /**
   * Handles processing of an admin-uploaded groom horoscope image
   */
  public async processGroomJob(payload: GroomJobPayload): Promise<void> {
    const { adminId, fileId, chatId } = payload;
    logger.info({ adminId, fileId }, 'Starting groom Jathagam extraction pipeline');

    try {
      await this.bot.api.sendMessage(
        chatId,
        '⏳ *Downloading and analyzing Groom Jathagam with Gemini AI...*\nPlease wait a few seconds.',
        { parse_mode: 'Markdown' }
      );

      const imageBuffer = await this.downloadTelegramFile(fileId);
      const { data: groomData } = await this.extractionService.processHoroscopeImage(imageBuffer);

      // Create a pending groom profile or activate it
      // For automated setup or confirmation, we save it as a new validated version
      const newGroomProfile = await GroomProfile.activateNewVersion(
        groomData,
        fileId,
        adminId,
        groomData.geminiModel
      );

      const summary = ReportGenerator.generateGroomSummary(
        groomData,
        newGroomProfile.version,
        true
      );

      await this.bot.api.sendMessage(
        chatId,
        `✅ *GROOM JATHAGAM SUCCESSFULLY REGISTERED & ACTIVATED!*\n\n${summary}\n\nThis profile is now the permanent reference for incoming bride horoscopes.`,
        { parse_mode: 'Markdown' }
      );

      logger.info(
        { version: newGroomProfile.version, adminId },
        'Groom profile successfully activated'
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ err, adminId }, 'Failed to process groom horoscope');

      await this.bot.api.sendMessage(
        chatId,
        `❌ *Failed to extract Groom Jathagam:*\n${errorMsg}\n\nPlease ensure the image is clear and contains a valid horoscope, then try again with \`/setgroom\`.`,
        { parse_mode: 'Markdown' }
      );

      throw err;
    }
  }
}
