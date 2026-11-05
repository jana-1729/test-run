import { describe, expect, it, vi } from 'vitest';
import { GeminiService } from '../../src/services/gemini.service.js';
import { ExtractionError } from '../../src/utils/errors.js';

describe('GeminiService Extraction & Safeguards', () => {
  it('accepts valid structured JSON and parses correctly', async () => {
    const validJsonOutput = JSON.stringify({
      documentType: 'JATHAGAM',
      documentLanguage: 'TAMIL',
      isHoroscopeDocument: true,
      nativeName: 'S. Jenani',
      janmaNakshatra: {
        rawText: 'உத்திராடம் பாதம் 2',
        normalizedValue: 'UTHIRADAM',
        status: 'READABLE',
        evidence: 'Field text',
      },
      janmaRasi: {
        rawText: 'மகரம்',
        normalizedValue: 'MAKARAM',
        status: 'READABLE',
        evidence: 'Field text',
      },
      lagna: {
        rawText: 'ரிஷபம்',
        normalizedValue: 'RISHABA',
        status: 'READABLE',
        evidence: 'Field text',
      },
      marsPosition: {
        rasiSign: 'MIDHUNAM',
        status: 'READABLE',
        sourceChart: 'RASI',
        evidence: 'Chart box',
      },
      marsHouse: {
        value: 2,
        sourceChart: 'RASI',
        status: 'READABLE',
        evidence: 'Box 2 from Lagna',
      },
      rasiChartPlanets: [],
      imageQuality: 'GOOD',
      overallExtractionConfidence: 0.95,
      unreadableFields: [],
    });

    const geminiService = new GeminiService('fake_key', 'gemini-2.5-flash');

    // Mock internal AI generateContent
    (geminiService as any).ai = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: validJsonOutput,
        }),
      },
    };

    const dummyBuffer = Buffer.from('fake_image_content');
    const { data } = await geminiService.extractHoroscope(dummyBuffer);

    expect(data.isHoroscopeDocument).toBe(true);
    expect(data.janmaNakshatra.rawText).toBe('உத்திராடம் பாதம் 2');
    expect(data.marsHouse.value).toBe(2);
    // Verification: Gemini extraction response does not contain any compatibility decision fields!
    expect((data as any).isMatched).toBeUndefined();
    expect((data as any).isCompatible).toBeUndefined();
  });

  it('rejects invalid JSON response from Gemini with ExtractionError', async () => {
    const geminiService = new GeminiService('fake_key', 'gemini-2.5-flash');

    (geminiService as any).ai = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: 'This is not valid JSON at all: { unclosed bracket',
        }),
      },
    };

    const dummyBuffer = Buffer.from('fake_image_content');
    await expect(geminiService.extractHoroscope(dummyBuffer)).rejects.toThrow(ExtractionError);
  });

  it('rejects schema-violating payload (e.g. invalid status value)', async () => {
    const invalidSchemaJson = JSON.stringify({
      documentType: 'JATHAGAM',
      janmaNakshatra: {
        status: 'INVALID_STATUS_VALUE', // invalid enum
      },
    });

    const geminiService = new GeminiService('fake_key', 'gemini-2.5-flash');

    (geminiService as any).ai = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: invalidSchemaJson,
        }),
      },
    };

    const dummyBuffer = Buffer.from('fake_image_content');
    await expect(geminiService.extractHoroscope(dummyBuffer)).rejects.toThrow(ExtractionError);
  });

  it('retries transient failures before succeeding', async () => {
    const geminiService = new GeminiService('fake_key', 'gemini-2.5-flash');

    const validJsonOutput = JSON.stringify({
      documentType: 'JATHAGAM',
      documentLanguage: 'TAMIL',
      isHoroscopeDocument: true,
      janmaNakshatra: { rawText: 'மூலம்', normalizedValue: 'MOOLA', status: 'READABLE', evidence: '' },
      janmaRasi: { rawText: 'தனுசு', normalizedValue: 'DHANUSU', status: 'READABLE', evidence: '' },
      lagna: { rawText: 'ரிஷபம்', normalizedValue: 'RISHABA', status: 'READABLE', evidence: '' },
      marsPosition: { rasiSign: 'MIDHUNAM', status: 'READABLE', sourceChart: 'RASI', evidence: '' },
      marsHouse: { value: 2, sourceChart: 'RASI', status: 'READABLE', evidence: '' },
      rasiChartPlanets: [],
      imageQuality: 'GOOD',
      overallExtractionConfidence: 0.95,
      unreadableFields: [],
    });

    const mockGenerate = vi
      .fn()
      .mockRejectedValueOnce(new Error('503 Service Unavailable: overloaded'))
      .mockResolvedValueOnce({ text: validJsonOutput });

    (geminiService as any).ai = {
      models: {
        generateContent: mockGenerate,
      },
    };

    const dummyBuffer = Buffer.from('fake_image_content');
    const { data } = await geminiService.extractHoroscope(dummyBuffer);

    expect(mockGenerate).toHaveBeenCalledTimes(2);
    expect(data.janmaNakshatra.normalizedValue).toBe('MOOLA');
  });
});
