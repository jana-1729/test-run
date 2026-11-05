import { Context } from 'grammy';
import { env } from '../../config/env.js';
import { ProcessedMessage } from '../../database/models/processed-message.model.js';
import { QueueService } from '../../queue/queue.service.js';
import { logger } from '../../utils/logger.js';

export class ChannelHandler {
  /**
   * Processes channel_post updates from the source private Telegram channel.
   */
  public static async handleChannelPost(ctx: Context): Promise<void> {
    const post = ctx.channelPost || ctx.message;
    if (!post) return;

    const channelIdStr = post.chat.id.toString();

    // 1. Never treat Destination Channel as an input channel
    if (channelIdStr === env.DESTINATION_CHANNEL_ID) {
      logger.debug(
        { channelIdStr, messageId: post.message_id },
        'Ignoring update from destination channel'
      );
      return;
    }

    // 2. Only accept messages from configured SOURCE_CHANNEL_ID
    if (channelIdStr !== env.SOURCE_CHANNEL_ID) {
      logger.info(
        { receivedChatId: channelIdStr, expectedSourceId: env.SOURCE_CHANNEL_ID },
        'Received message from non-source chat. Ignoring.'
      );
      return;
    }

    const messageId = post.message_id;
    const mediaGroupId = post.media_group_id;

    // 3. Extract fileId if message contains a photo or supported image document
    let fileId: string | null = null;

    if (post.photo && post.photo.length > 0) {
      // Pick highest resolution photo (last element)
      fileId = post.photo[post.photo.length - 1].file_id;
    } else if (post.document) {
      const mime = post.document.mime_type?.toLowerCase() || '';
      if (
        mime === 'image/jpeg' ||
        mime === 'image/jpg' ||
        mime === 'image/png' ||
        mime === 'image/webp'
      ) {
        fileId = post.document.file_id;
      }
    }

    // Ignore unsupported messages (plain text, video, audio, etc.)
    if (!fileId) {
      logger.info(
        { messageId, channelIdStr },
        'Channel post does not contain a supported horoscope image. Ignoring.'
      );
      return;
    }

    // 4. Duplicate protection
    const existing = await ProcessedMessage.findOne({
      sourceChannelId: channelIdStr,
      sourceMessageId: messageId,
    }).exec();

    if (existing && (existing.processingStatus === 'COMPLETED' || existing.processingStatus === 'PROCESSING')) {
      logger.info(
        { messageId, channelIdStr, status: existing.processingStatus },
        'Message already processed or currently processing. Skipping.'
      );
      return;
    }

    // 5. Media group deduplication
    if (mediaGroupId) {
      const albumAlreadyQueued = await ProcessedMessage.findOne({
        sourceChannelId: channelIdStr,
        mediaGroupId,
      }).exec();

      if (albumAlreadyQueued) {
        logger.info(
          { messageId, mediaGroupId },
          'Media group album already registered for processing. Skipping auxiliary image.'
        );
        return;
      }
    }

    // 6. Register pending message
    await ProcessedMessage.findOneAndUpdate(
      { sourceChannelId: channelIdStr, sourceMessageId: messageId },
      {
        $set: {
          processingStatus: 'PENDING',
          mediaGroupId,
        },
      },
      { upsert: true }
    ).exec();

    // 7. Enqueue background processing job
    await QueueService.enqueueBrideJob({
      sourceChannelId: channelIdStr,
      sourceMessageId: messageId,
      fileId,
      mediaGroupId,
    });

    logger.info(
      { messageId, channelIdStr, fileId },
      'Successfully enqueued incoming bride horoscope image for background processing'
    );
  }
}
