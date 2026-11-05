import { describe, expect, it } from 'vitest';
import { JathagamExtractionSchema } from '../../src/schemas/jathagam.schema.js';

describe('JathagamExtractionSchema', () => {
  it('successfully validates a complete valid extraction payload', () => {
    const validData = {
      documentType: 'JATHAGAM',
      documentLanguage: 'TAMIL',
      isHoroscopeDocument: true,
      nativeName: 'S. Jenani',
      dateOfBirth: '18/05/2006',
      timeOfBirth: '07.42 AM',
      placeOfBirth: 'Namakkal',
      janmaNakshatra: {
        rawText: 'உத்திராடம் பாதம் 2',
        normalizedValue: 'UTHIRADAM',
        status: 'READABLE',
        evidence: 'நட்சத்திரம் : உத்திராடம் பாதம் 2',
      },
      janmaRasi: {
        rawText: 'மகரம்',
        normalizedValue: 'MAKARAM',
        status: 'READABLE',
        evidence: 'இராசி : மகரம்',
      },
      lagna: {
        rawText: 'ரிஷபம்',
        normalizedValue: 'RISHABA',
        status: 'READABLE',
        evidence: 'இலக்கனம் : ரிஷபம்',
      },
      marsPosition: {
        rasiSign: 'MIDHUNAM',
        tamilRasiSign: 'மிதுனம்',
        status: 'READABLE',
        sourceChart: 'RASI',
        evidence: 'Box Row 1 Col 4 has செவ்',
      },
      marsHouse: {
        value: 2,
        sourceChart: 'RASI',
        status: 'READABLE',
        evidence: '2nd from Rishaba',
        calculationBasis: 'Lagna=Rishaba, Mars=Midhunam',
      },
      rasiChartPlanets: [
        { planet: 'MARS', tamilName: 'செவ்', rasiSign: 'MIDHUNAM', houseFromLagna: 2 },
      ],
      imageQuality: 'GOOD',
      overallExtractionConfidence: 0.95,
      unreadableFields: [],
    };

    const parsed = JathagamExtractionSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.marsHouse.value).toBe(2);
      expect(parsed.data.janmaNakshatra.normalizedValue).toBe('UTHIRADAM');
    }
  });

  it('fails validation when marsHouse value is out of 1-12 bounds', () => {
    const invalidData = {
      janmaNakshatra: { rawText: 'Star', normalizedValue: 'STAR', status: 'READABLE', evidence: '' },
      janmaRasi: { rawText: 'Rasi', normalizedValue: 'RASI', status: 'READABLE', evidence: '' },
      lagna: { rawText: 'Lagna', normalizedValue: 'LAGNA', status: 'READABLE', evidence: '' },
      marsPosition: { rasiSign: 'MESHAM', status: 'READABLE', evidence: '' },
      marsHouse: { value: 13, sourceChart: 'RASI', status: 'READABLE', evidence: '' }, // 13 is invalid!
    };

    const parsed = JathagamExtractionSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });
});
