import { Bot } from 'grammy';
import { env } from '../config/env.js';
import { MatchingDecision } from '../matching/result.types.js';
import { JathagamExtraction } from '../schemas/jathagam.schema.js';
import { logger } from '../utils/logger.js';
import { ReportGenerator } from '../utils/report.js';

export interface ForwardingResult {
  forwarded: boolean;
  destinationMessageId?: number;
  reportMessageId?: number;
}

export class ForwardingService {
  private bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  /**
   * Forwards a passing bride Jathagam message to the destination private channel.
   * If result is PASS: forwards the original message and posts the matching report.
   * If result is REVIEW: sends an alert to configured administrators.
   * If result is FAIL: does not forward anything.
   */
  public async handleDecisionOutcome(
    decision: MatchingDecision,
    brideData: JathagamExtraction,
    sourceChannelId: string,
    sourceMessageId: number,
    alreadyForwarded = false
  ): Promise<ForwardingResult> {
    const reportText = ReportGenerator.generateMatchReport(decision, brideData);

    if (decision.overallStatus === 'PASS') {
      if (alreadyForwarded) {
        logger.info(
          { sourceChannelId, sourceMessageId },
          'Message already marked as forwarded. Skipping duplicate forwarding.'
        );
        return { forwarded: true };
      }

      try {
        // 1. Forward original message to Destination Channel
        const forwardedMsg = await this.bot.api.forwardMessage(
          env.DESTINATION_CHANNEL_ID,
          sourceChannelId,
          sourceMessageId
        );

        logger.info(
          {
            destinationChannelId: env.DESTINATION_CHANNEL_ID,
            forwardedMessageId: forwardedMsg.message_id,
            sourceMessageId,
          },
          'Successfully forwarded matching bride Jathagam to destination channel'
        );

        // 2. Post detailed matching report right below the forwarded message
        let reportMsgId: number | undefined;
        try {
          const reportMsg = await this.bot.api.sendMessage(
            env.DESTINATION_CHANNEL_ID,
            reportText,
            {
              parse_mode: 'Markdown',
              reply_parameters: { message_id: forwardedMsg.message_id },
            }
          );
          reportMsgId = reportMsg.message_id;
        } catch (reportErr) {
          logger.warn(
            { reportErr },
            'Could not attach reply report; sending as standalone message'
          );
          const reportMsg = await this.bot.api.sendMessage(
            env.DESTINATION_CHANNEL_ID,
            reportText,
            { parse_mode: 'Markdown' }
          );
          reportMsgId = reportMsg.message_id;
        }

        return {
          forwarded: true,
          destinationMessageId: forwardedMsg.message_id,
          reportMessageId: reportMsgId,
        };
      } catch (err) {
        logger.error({ err, sourceChannelId, sourceMessageId }, 'Failed to forward message');
        throw err;
      }
    } else if (decision.overallStatus === 'REVIEW') {
      logger.info(
        { sourceChannelId, sourceMessageId },
        'Horoscope marked for manual REVIEW. Notifying admins.'
      );
      // Notify all admins of the pending review
      const adminAlert =
        `⚠️ *HOROSCOPE MANUAL REVIEW REQUIRED*\n\n` +
        `Source Channel: \`${sourceChannelId}\`\n` +
        `Source Message ID: \`${sourceMessageId}\`\n\n` +
        `*Review Reasons:*\n${decision.reasons.map((r) => `• ${r}`).join('\n')}\n\n` +
        `Use \`/result ${sourceMessageId}\` to inspect details or \`/retry ${sourceMessageId}\` after verifying.`;

      for (const adminId of env.ADMIN_TELEGRAM_IDS) {
        try {
          await this.bot.api.sendMessage(adminId, adminAlert, { parse_mode: 'Markdown' });
        } catch (adminErr) {
          logger.warn({ adminId, adminErr }, 'Failed to send review alert to admin');
        }
      }
      return { forwarded: false };
    } else {
      // FAIL: Log and do not forward
      logger.info(
        { sourceChannelId, sourceMessageId, reasons: decision.reasons },
        'Horoscope does not meet matching rules. Not forwarding.'
      );
      return { forwarded: false };
    }
  }
}
