import { Context } from 'grammy';
import { defaultMatchingConfig } from '../../config/matching-rules.js';
import { BrideProfile } from '../../database/models/bride-profile.model.js';
import { GroomProfile } from '../../database/models/groom-profile.model.js';
import { MatchResult } from '../../database/models/match-result.model.js';
import { ProcessedMessage } from '../../database/models/processed-message.model.js';
import { QueueService } from '../../queue/queue.service.js';
import { logger } from '../../utils/logger.js';
import { ReportGenerator } from '../../utils/report.js';

// State tracker for admin waiting to upload groom image
const awaitingGroomUploads = new Set<number>();

export class AdminHandler {
  /**
   * /start - Introduction and admin greeting
   */
  public static async handleStart(ctx: Context): Promise<void> {
    const text =
      `👋 *Welcome to the AI Jathagam Matching Telegram Bot*\n\n` +
      `This bot automates the filtering and matching of incoming Bride Jathagams (horoscopes) against a fixed Groom reference profile using Google Gemini AI.\n\n` +
      `👑 *Authorized Admin:* \`${ctx.from?.id}\`\n\n` +
      `Type \`/help\` to see all management commands.`;

    await ctx.reply(text, { parse_mode: 'Markdown' });
  }

  /**
   * /help - Command list
   */
  public static async handleHelp(ctx: Context): Promise<void> {
    const text =
      `📖 *AVAILABLE ADMIN COMMANDS*\n\n` +
      `*Groom Profile Management:*\n` +
      `• \`/setgroom\` - Upload reference Groom Jathagam image\n` +
      `• \`/groom\` - View active Groom horoscope profile\n` +
      `• \`/groomstatus\` - Check groom profile readiness & validity\n` +
      `• \`/replacegroom\` - Initiate replacement of active groom profile\n` +
      `• \`/groomhistory\` - View previous groom profile versions\n\n` +
      `*Matching & Inspection:*\n` +
      `• \`/stats\` - View processing and matching statistics\n` +
      `• \`/review\` - View pending items needing manual verification\n` +
      `• \`/result <id>\` - Inspect extraction and match details for a message\n` +
      `• \`/retry <id>\` - Retry a failed or reviewable processing job\n` +
      `• \`/rules\` - View active matching rules and allowed combinations\n` +
      `• \`/health\` - View system health (DB, bot, version)`;

    await ctx.reply(text, { parse_mode: 'Markdown' });
  }

  /**
   * /setgroom - Prompt admin to upload groom Jathagam
   */
  public static async handleSetGroom(ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    awaitingGroomUploads.add(userId);
    await ctx.reply(
      `📸 *UPLOAD GROOM JATHAGAM*\n\n` +
      `Please send the groom's horoscope image (photo or document) now.\n\n` +
      `Gemini will extract the horoscope details and activate the profile as the permanent reference.`,
      { parse_mode: 'Markdown' }
    );
  }

  /**
   * /replacegroom - Confirm replacement and prompt upload
   */
  public static async handleReplaceGroom(ctx: Context): Promise<void> {
    const active = await GroomProfile.getActiveProfile();
    let text = `⚠️ *REPLACE ACTIVE GROOM PROFILE*\n\n`;
    if (active) {
      text += `Currently active: *v${active.version}* (Star: ${active.extractedData.janmaNakshatra.normalizedValue}, Rasi: ${active.extractedData.janmaRasi.normalizedValue})\n\n`;
    }
    text += `To replace this profile, please send the new groom's horoscope image now.`;

    const userId = ctx.from?.id;
    if (userId) awaitingGroomUploads.add(userId);

    await ctx.reply(text, { parse_mode: 'Markdown' });
  }

  /**
   * Handles photo / document uploaded by admin in /setgroom mode
   */
  public static async handleAdminPhotoUpload(ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId || !awaitingGroomUploads.has(userId)) return;

    let fileId: string | null = null;
    if (ctx.message?.photo && ctx.message.photo.length > 0) {
      fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    } else if (ctx.message?.document) {
      fileId = ctx.message.document.file_id;
    }

    if (!fileId) {
      await ctx.reply('⚠️ Please send a valid image file (photo or document).');
      return;
    }

    awaitingGroomUploads.delete(userId);

    await ctx.reply('⏳ *Enqueued groom horoscope image for extraction...*', {
      parse_mode: 'Markdown',
    });

    await QueueService.enqueueGroomJob({
      adminId: userId,
      fileId,
      chatId: ctx.chat?.id || userId,
    });
  }

  /**
   * /groom - View active groom profile
   */
  public static async handleGetGroom(ctx: Context): Promise<void> {
    const active = await GroomProfile.getActiveProfile();
    if (!active) {
      await ctx.reply(
        '⚠️ *No active groom profile found.*\nUse `/setgroom` to upload and activate one.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const summary = ReportGenerator.generateGroomSummary(
      active.extractedData,
      active.version,
      active.active
    );
    await ctx.reply(summary, { parse_mode: 'Markdown' });
  }

  /**
   * /groomstatus - Check groom profile readiness
   */
  public static async handleGroomStatus(ctx: Context): Promise<void> {
    const active = await GroomProfile.getActiveProfile();
    if (!active) {
      await ctx.reply(
        '❌ *Groom Status:* NOT CONFIGURED\n\nIncoming bride horoscopes cannot be processed until an active groom profile is uploaded via `/setgroom`.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const data = active.extractedData;
    const isStarOk = data.janmaNakshatra.status === 'READABLE' && !!data.janmaNakshatra.normalizedValue;
    const isRasiOk = data.janmaRasi.status === 'READABLE' && !!data.janmaRasi.normalizedValue;
    const isLagnaOk = data.lagna.status === 'READABLE' && !!data.lagna.normalizedValue;

    const ready = isStarOk && isRasiOk && isLagnaOk;

    const text =
      `👤 *GROOM PROFILE READINESS STATUS*\n\n` +
      `• *Overall Readiness:* ${ready ? '✅ READY FOR MATCHING' : '⚠️ INCOMPLETE'}\n` +
      `• *Version:* v${active.version}\n` +
      `• *Active:* ${active.active ? 'Yes' : 'No'}\n` +
      `• *Nakshatra:* ${data.janmaNakshatra.normalizedValue || 'Missing'} (${data.janmaNakshatra.status})\n` +
      `• *Rasi:* ${data.janmaRasi.normalizedValue || 'Missing'} (${data.janmaRasi.status})\n` +
      `• *Lagna:* ${data.lagna.normalizedValue || 'Missing'} (${data.lagna.status})\n` +
      `• *Confidence:* ${((data.overallExtractionConfidence ?? 1) * 100).toFixed(0)}%\n` +
      `• *Created:* ${active.createdAt.toISOString()}`;

    await ctx.reply(text, { parse_mode: 'Markdown' });
  }

  /**
   * /groomhistory - List all groom versions
   */
  public static async handleGroomHistory(ctx: Context): Promise<void> {
    const profiles = await GroomProfile.find().sort({ version: -1 }).limit(10).exec();
    if (profiles.length === 0) {
      await ctx.reply('No groom profile history found.');
      return;
    }

    let text = `📜 *GROOM PROFILE HISTORY (Last 10 Versions)*\n\n`;
    for (const p of profiles) {
      text += `• *v${p.version}* ${p.active ? '🟢 (ACTIVE)' : '⚪'}\n`;
      text += `  Star: ${p.extractedData.janmaNakshatra.normalizedValue || 'N/A'} | Rasi: ${p.extractedData.janmaRasi.normalizedValue || 'N/A'}\n`;
      text += `  Created: ${p.createdAt.toISOString().slice(0, 10)} by Admin ${p.activatedBy}\n\n`;
    }

    await ctx.reply(text, { parse_mode: 'Markdown' });
  }

  /**
   * /stats - Processing and matching statistics
   */
  public static async handleStats(ctx: Context): Promise<void> {
    const totalReceived = await ProcessedMessage.countDocuments();
    const totalPass = await MatchResult.countDocuments({ overallStatus: 'PASS' });
    const totalFail = await MatchResult.countDocuments({ overallStatus: 'FAIL' });
    const totalReview = await MatchResult.countDocuments({ overallStatus: 'REVIEW' });
    const totalForwarded = await MatchResult.countDocuments({ forwarded: true });
    const totalErrors = await ProcessedMessage.countDocuments({ processingStatus: 'FAILED' });

    const text =
      `📊 *JATHAGAM PROCESSING STATISTICS*\n\n` +
      `• *Total Received:* ${totalReceived}\n` +
      `• *✅ Passed Matches:* ${totalPass}\n` +
      `• *❌ Failed Matches:* ${totalFail}\n` +
      `• *⚠️ Review Required:* ${totalReview}\n` +
      `• *🚀 Forwarded to Channel:* ${totalForwarded}\n` +
      `• *💥 Processing Errors:* ${totalErrors}`;

    await ctx.reply(text, { parse_mode: 'Markdown' });
  }

  /**
   * /review - Pending manual verification items
   */
  public static async handleReview(ctx: Context): Promise<void> {
    const pendingReviews = await MatchResult.find({ overallStatus: 'REVIEW' })
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();

    if (pendingReviews.length === 0) {
      await ctx.reply('🎉 No pending items requiring manual review.');
      return;
    }

    let text = `⚠️ *PENDING REVIEW ITEMS (Last 5)*\n\n`;
    for (const item of pendingReviews) {
      text += `• *Message ID:* \`${item.sourceMessageId}\` in \`${item.sourceChannelId}\`\n`;
      text += `  Reasons: ${item.reasons.join(', ')}\n`;
      text += `  Inspect: \`/result ${item.sourceMessageId}\` | Retry: \`/retry ${item.sourceMessageId}\`\n\n`;
    }

    await ctx.reply(text, { parse_mode: 'Markdown' });
  }

  /**
   * /result <message_id> - Inspect details of a specific message
   */
  public static async handleResult(ctx: Context): Promise<void> {
    const parts = ctx.message?.text?.split(' ') || [];
    const messageIdStr = parts[1];
    if (!messageIdStr || isNaN(Number(messageIdStr))) {
      await ctx.reply('⚠️ Please provide a message ID. Example: `/result 123`', {
        parse_mode: 'Markdown',
      });
      return;
    }

    const messageId = Number(messageIdStr);
    const result = await MatchResult.findOne({ sourceMessageId: messageId }).exec();
    const bride = await BrideProfile.findOne({ sourceMessageId: messageId }).exec();

    if (!result || !bride) {
      await ctx.reply(`❌ No record found for source message ID: ${messageId}`);
      return;
    }

    const report = ReportGenerator.generateMatchReport(
      {
        overallStatus: result.overallStatus,
        ruleResults: result.ruleResults,
        reasons: result.reasons,
        groomProfileVersion: result.groomProfileVersion,
        brideSummary: {
          rawNakshatra: bride.extractedData.janmaNakshatra.rawText,
          normalizedNakshatra: bride.extractedData.janmaNakshatra.normalizedValue,
          rawRasi: bride.extractedData.janmaRasi.rawText,
          normalizedRasi: bride.extractedData.janmaRasi.normalizedValue,
          lagna: bride.extractedData.lagna.normalizedValue,
          marsSign: bride.extractedData.marsPosition.rasiSign,
          marsHouse: bride.extractedData.marsHouse.value,
        },
        evaluatedAt: result.createdAt,
      },
      bride.extractedData
    );

    let details = `${report}\n\n`;
    details += `• *Forwarded:* ${result.forwarded ? 'Yes' : 'No'}\n`;
    if (result.destinationMessageId) {
      details += `• *Destination Msg ID:* ${result.destinationMessageId}\n`;
    }

    await ctx.reply(details, { parse_mode: 'Markdown' });
  }

  /**
   * /retry <message_id> - Re-enqueue a message for processing
   */
  public static async handleRetry(ctx: Context): Promise<void> {
    const parts = ctx.message?.text?.split(' ') || [];
    const messageIdStr = parts[1];
    if (!messageIdStr || isNaN(Number(messageIdStr))) {
      await ctx.reply('⚠️ Please provide a message ID. Example: `/retry 123`', {
        parse_mode: 'Markdown',
      });
      return;
    }

    const messageId = Number(messageIdStr);
    const bride = await BrideProfile.findOne({ sourceMessageId: messageId }).exec();

    if (!bride) {
      await ctx.reply(`❌ No original file reference found for message ID: ${messageId}`);
      return;
    }

    await QueueService.enqueueBrideJob({
      sourceChannelId: bride.sourceChannelId,
      sourceMessageId: bride.sourceMessageId,
      fileId: bride.originalFileReference,
      mediaGroupId: bride.mediaGroupId,
    });

    await ctx.reply(
      `🔄 Message \`${messageId}\` has been re-enqueued for background processing.`,
      { parse_mode: 'Markdown' }
    );
  }

  /**
   * /rules - Show active matching rules
   */
  public static async handleRules(ctx: Context): Promise<void> {
    let text = `📜 *ACTIVE JATHAGAM MATCHING RULES (v${defaultMatchingConfig.version})*\n\n`;
    text += `*Rule 1: Mars House Condition (செவ்வாய் 2, 4, 7, 8, 12-ல் வேண்டும்)*\n`;
    text += `• Mars must be positioned in house: *2, 4, 7, 8, or 12* relative to bride Lagna.\n`;
    text += `• Authoritative chart: *${defaultMatchingConfig.authoritativeChart}*\n\n`;
    text += `*Rule 2: Allowed Nakshatra + Rasi Pairs (இவை மட்டும் பொருந்தும்)*\n`;
    text += `Strictly accepted pairs (8 combinations):\n`;
    defaultMatchingConfig.allowedPairs.forEach((p, idx) => {
      text += `${idx + 1}. *${p.tamilNakshatra}* (${p.nakshatra}) + *${p.tamilRasi}* (${p.rasi})\n`;
    });
    text += `\n*Decision Precedence:* FAIL > REVIEW > PASS`;

    await ctx.reply(text, { parse_mode: 'Markdown' });
  }

  /**
   * /health - System health check
   */
  public static async handleHealth(ctx: Context): Promise<void> {
    const memory = process.memoryUsage();
    const activeGroom = await GroomProfile.getActiveProfile();

    const text =
      `🏥 *SYSTEM HEALTH CHECK*\n\n` +
      `• *Node.js Version:* \`${process.version}\`\n` +
      `• *Uptime:* ${(process.uptime() / 60).toFixed(1)} minutes\n` +
      `• *RSS Memory:* ${(memory.rss / (1024 * 1024)).toFixed(1)} MB\n` +
      `• *Active Groom Profile:* ${activeGroom ? `v${activeGroom.version} (Active)` : '❌ None'}\n` +
      `• *Matching Rules:* v${defaultMatchingConfig.version}`;

    await ctx.reply(text, { parse_mode: 'Markdown' });
  }
}
