import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrideProfile } from '../../src/database/models/bride-profile.model.js';
import { GroomProfile } from '../../src/database/models/groom-profile.model.js';
import { MatchResult } from '../../src/database/models/match-result.model.js';
import { ProcessedMessage } from '../../src/database/models/processed-message.model.js';
import { BackgroundWorker } from '../../src/queue/worker.js';
import { ExtractionService } from '../../src/services/extraction.service.js';

vi.mock('../../src/database/models/bride-profile.model.js');
vi.mock('../../src/database/models/groom-profile.model.js');
vi.mock('../../src/database/models/match-result.model.js');
vi.mock('../../src/database/models/processed-message.model.js');

describe('End-to-End Processing Pipeline', () => {
  let mockBot: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBot = {
      api: {
        forwardMessage: vi.fn().mockResolvedValue({ message_id: 9901 }),
        sendMessage: vi.fn().mockResolvedValue({ message_id: 9902 }),
        getFile: vi.fn().mockResolvedValue({ file_path: 'mock/path/sample.jpg' }),
      },
    };
  });

  it('runs complete pipeline for Sample Bride 1 (S. Jenani): Mars passes, Star fails -> Overall FAIL, not forwarded', async () => {
    // 1. Mock active groom
    vi.mocked(GroomProfile.getActiveProfile).mockResolvedValue({
      _id: 'groom_mock_id_1',
      version: 1,
      extractedData: {
        janmaNakshatra: { rawText: 'திருவோணம்', normalizedValue: 'THIRUVONAM' },
        janmaRasi: { rawText: 'மகரம்', normalizedValue: 'MAKARAM' },
        lagna: { rawText: 'கடகம்', normalizedValue: 'KADAGAM' },
        marsPosition: { rasiSign: 'MIDHUNAM' },
        marsHouse: { value: 12 },
      },
    } as any);

    // 2. Mock ProcessedMessage & MatchResult
    vi.mocked(ProcessedMessage.findOneAndUpdate).mockReturnValue({
      exec: vi.fn().mockResolvedValue({}),
    } as any);
    vi.mocked(MatchResult.findOne).mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    } as any);
    vi.mocked(MatchResult.findOneAndUpdate).mockReturnValue({
      exec: vi.fn().mockResolvedValue({}),
    } as any);
    vi.mocked(BrideProfile.findOneAndUpdate).mockReturnValue({
      exec: vi.fn().mockResolvedValue({ _id: 'bride_mock_id_1' }),
    } as any);

    // 3. Mock ExtractionService returning S. Jenani's exact extracted data
    const mockExtractionService = {
      processHoroscopeImage: vi.fn().mockResolvedValue({
        data: {
          documentType: 'JATHAGAM',
          documentLanguage: 'TAMIL',
          isHoroscopeDocument: true,
          nativeName: 'S. Jenani',
          janmaNakshatra: {
            rawText: 'உத்திராடம் பாதம் 2',
            normalizedValue: 'UTHIRADAM',
            status: 'READABLE',
            evidence: 'Text label',
          },
          janmaRasi: {
            rawText: 'மகரம்',
            normalizedValue: 'MAKARAM',
            status: 'READABLE',
            evidence: 'Text label',
          },
          lagna: {
            rawText: 'ரிஷபம்',
            normalizedValue: 'RISHABA',
            status: 'READABLE',
            evidence: 'Text label',
          },
          marsPosition: {
            rasiSign: 'MIDHUNAM',
            status: 'READABLE',
            sourceChart: 'RASI',
            evidence: 'Box 4 has செவ்',
          },
          marsHouse: {
            value: 2,
            sourceChart: 'RASI',
            status: 'READABLE',
            evidence: 'Mars in Gemini, Lagna in Taurus',
          },
          rasiChartPlanets: [],
          navamsamChartPlanets: [],
          imageQuality: 'GOOD',
          overallExtractionConfidence: 0.95,
          unreadableFields: [],
        },
        rawGeminiResponse: '{}',
      }),
    } as unknown as ExtractionService;

    const worker = new BackgroundWorker(mockBot, mockExtractionService);
    // Mock downloadTelegramFile to avoid actual HTTP call
    worker.downloadTelegramFile = vi.fn().mockResolvedValue(Buffer.from('mock_image'));

    await worker.processBrideJob({
      sourceChannelId: '-1001111111111',
      sourceMessageId: 777,
      fileId: 'bride_file_123',
    });

    // Verify:
    // Mars is in 2nd house (allowed)
    // Star Uthiradam + Makaram is NOT in allowed combinations
    // Overall decision must be FAIL
    expect(mockBot.api.forwardMessage).not.toHaveBeenCalled();
    expect(MatchResult.findOneAndUpdate).toHaveBeenCalledWith(
      { sourceChannelId: '-1001111111111', sourceMessageId: 777 },
      expect.objectContaining({
        $set: expect.objectContaining({
          overallStatus: 'FAIL',
          forwarded: false,
        }),
      }),
      expect.anything()
    );
  });

  it('runs complete pipeline for Matching Bride: Mars passes, Star passes -> Overall PASS, forwarded with report', async () => {
    // 1. Mock active groom
    vi.mocked(GroomProfile.getActiveProfile).mockResolvedValue({
      _id: 'groom_mock_id_1',
      version: 1,
      extractedData: {},
    } as any);

    vi.mocked(ProcessedMessage.findOneAndUpdate).mockReturnValue({
      exec: vi.fn().mockResolvedValue({}),
    } as any);
    vi.mocked(MatchResult.findOne).mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    } as any);
    vi.mocked(MatchResult.findOneAndUpdate).mockReturnValue({
      exec: vi.fn().mockResolvedValue({}),
    } as any);
    vi.mocked(BrideProfile.findOneAndUpdate).mockReturnValue({
      exec: vi.fn().mockResolvedValue({ _id: 'bride_mock_id_2' }),
    } as any);

    // 2. Mock bride with Moola + Dhanusu and Mars in House 2
    const mockExtractionService = {
      processHoroscopeImage: vi.fn().mockResolvedValue({
        data: {
          documentType: 'JATHAGAM',
          documentLanguage: 'TAMIL',
          isHoroscopeDocument: true,
          nativeName: 'Matching Bride',
          janmaNakshatra: {
            rawText: 'மூலம்',
            normalizedValue: 'MOOLA',
            status: 'READABLE',
            evidence: '',
          },
          janmaRasi: {
            rawText: 'தனுசு',
            normalizedValue: 'DHANUSU',
            status: 'READABLE',
            evidence: '',
          },
          lagna: {
            rawText: 'ரிஷபம்',
            normalizedValue: 'RISHABA',
            status: 'READABLE',
            evidence: '',
          },
          marsPosition: {
            rasiSign: 'MIDHUNAM',
            status: 'READABLE',
            sourceChart: 'RASI',
            evidence: '',
          },
          marsHouse: {
            value: 2,
            sourceChart: 'RASI',
            status: 'READABLE',
            evidence: '',
          },
          rasiChartPlanets: [],
          navamsamChartPlanets: [],
          imageQuality: 'GOOD',
          overallExtractionConfidence: 0.98,
          unreadableFields: [],
        },
        rawGeminiResponse: '{}',
      }),
    } as unknown as ExtractionService;

    const worker = new BackgroundWorker(mockBot, mockExtractionService);
    worker.downloadTelegramFile = vi.fn().mockResolvedValue(Buffer.from('mock_image'));

    await worker.processBrideJob({
      sourceChannelId: '-1001111111111',
      sourceMessageId: 888,
      fileId: 'bride_file_pass',
    });

    // Verify:
    // Mars in house 2 (PASS)
    // Moola + Dhanusu (PASS)
    // Forwarded to destination channel!
    expect(mockBot.api.forwardMessage).toHaveBeenCalledWith(
      expect.anything(),
      '-1001111111111',
      888
    );
    expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('JATHAGAM MATCH RESULT'),
      expect.anything()
    );
    expect(MatchResult.findOneAndUpdate).toHaveBeenCalledWith(
      { sourceChannelId: '-1001111111111', sourceMessageId: 888 },
      expect.objectContaining({
        $set: expect.objectContaining({
          overallStatus: 'PASS',
          forwarded: true,
          destinationMessageId: 9901,
        }),
      }),
      expect.anything()
    );
  });
});
