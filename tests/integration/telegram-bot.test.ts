import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminHandler } from '../../src/bot/handlers/admin.handler.js';
import { ChannelHandler } from '../../src/bot/handlers/channel.handler.js';
import { env } from '../../src/config/env.js';
import { ProcessedMessage } from '../../src/database/models/processed-message.model.js';
import { adminGuard } from '../../src/middleware/admin.middleware.js';
import { QueueService } from '../../src/queue/queue.service.js';

vi.mock('../../src/database/models/processed-message.model.js');
vi.mock('../../src/queue/queue.service.js');

describe('Telegram Integration & Bot Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ChannelHandler', () => {
    it('processes message from SOURCE_CHANNEL_ID containing a photo', async () => {
      vi.mocked(ProcessedMessage.findOne).mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      } as any);

      vi.mocked(ProcessedMessage.findOneAndUpdate).mockReturnValue({
        exec: vi.fn().mockResolvedValue({}),
      } as any);

      const enqueueSpy = vi.mocked(QueueService.enqueueBrideJob).mockResolvedValue({} as any);

      const fakeCtx = {
        channelPost: {
          chat: { id: env.SOURCE_CHANNEL_ID },
          message_id: 101,
          photo: [
            { file_id: 'small_photo_id', width: 100, height: 100 },
            { file_id: 'large_photo_id', width: 800, height: 800 },
          ],
        },
      } as any;

      await ChannelHandler.handleChannelPost(fakeCtx);

      expect(enqueueSpy).toHaveBeenCalledTimes(1);
      expect(enqueueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceChannelId: env.SOURCE_CHANNEL_ID,
          sourceMessageId: 101,
          fileId: 'large_photo_id',
        })
      );
    });

    it('ignores message when coming from DESTINATION_CHANNEL_ID', async () => {
      const enqueueSpy = vi.mocked(QueueService.enqueueBrideJob);

      const fakeCtx = {
        channelPost: {
          chat: { id: env.DESTINATION_CHANNEL_ID },
          message_id: 202,
          photo: [{ file_id: 'some_photo' }],
        },
      } as any;

      await ChannelHandler.handleChannelPost(fakeCtx);
      expect(enqueueSpy).not.toHaveBeenCalled();
    });

    it('ignores message from an unknown / random channel', async () => {
      const enqueueSpy = vi.mocked(QueueService.enqueueBrideJob);

      const fakeCtx = {
        channelPost: {
          chat: { id: '-1009999999999' },
          message_id: 303,
          photo: [{ file_id: 'some_photo' }],
        },
      } as any;

      await ChannelHandler.handleChannelPost(fakeCtx);
      expect(enqueueSpy).not.toHaveBeenCalled();
    });

    it('ignores message without supported horoscope image (e.g. plain text or video)', async () => {
      const enqueueSpy = vi.mocked(QueueService.enqueueBrideJob);

      const fakeCtx = {
        channelPost: {
          chat: { id: env.SOURCE_CHANNEL_ID },
          message_id: 404,
          text: 'Hello, this is just text without any horoscope photo',
        },
      } as any;

      await ChannelHandler.handleChannelPost(fakeCtx);
      expect(enqueueSpy).not.toHaveBeenCalled();
    });

    it('prevents duplicate processing if message is already completed or processing', async () => {
      vi.mocked(ProcessedMessage.findOne).mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          sourceChannelId: env.SOURCE_CHANNEL_ID,
          sourceMessageId: 505,
          processingStatus: 'COMPLETED',
        }),
      } as any);

      const enqueueSpy = vi.mocked(QueueService.enqueueBrideJob);

      const fakeCtx = {
        channelPost: {
          chat: { id: env.SOURCE_CHANNEL_ID },
          message_id: 505,
          photo: [{ file_id: 'photo_dup' }],
        },
      } as any;

      await ChannelHandler.handleChannelPost(fakeCtx);
      expect(enqueueSpy).not.toHaveBeenCalled();
    });
  });

  describe('Admin Authorization (adminGuard)', () => {
    it('allows authorized admin user IDs', async () => {
      const nextFn = vi.fn();
      const fakeCtx = {
        from: { id: env.ADMIN_TELEGRAM_IDS[0] },
      } as any;

      await adminGuard(fakeCtx, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
    });

    it('rejects unauthorized users with access denied message', async () => {
      const nextFn = vi.fn();
      const replyFn = vi.fn();
      const fakeCtx = {
        from: { id: 99999999 }, // not in admin list
        reply: replyFn,
      } as any;

      await adminGuard(fakeCtx, nextFn);
      expect(nextFn).not.toHaveBeenCalled();
      expect(replyFn).toHaveBeenCalledWith(
        expect.stringContaining('Access Denied'),
        expect.anything()
      );
    });

    it('rejects admin commands sent inside channel posts', async () => {
      const nextFn = vi.fn();
      const fakeCtx = {
        channelPost: { chat: { id: 12345 } },
        from: { id: env.ADMIN_TELEGRAM_IDS[0] },
      } as any;

      await adminGuard(fakeCtx, nextFn);
      expect(nextFn).not.toHaveBeenCalled();
    });
  });
});
