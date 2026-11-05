import { describe, expect, it } from 'vitest';
import { StarRasiRule } from '../../src/matching/rules/star-rasi.rule.js';
import { JathagamExtraction } from '../../src/schemas/jathagam.schema.js';

function createBrideWithStarRasi(
  star: string,
  rasi: string,
  starStatus: 'READABLE' | 'AMBIGUOUS' | 'UNREADABLE' | 'MISSING' = 'READABLE',
  rasiStatus: 'READABLE' | 'AMBIGUOUS' | 'UNREADABLE' | 'MISSING' = 'READABLE'
): JathagamExtraction {
  return {
    documentType: 'JATHAGAM',
    documentLanguage: 'TAMIL',
    isHoroscopeDocument: true,
    janmaNakshatra: {
      rawText: star,
      normalizedValue: star,
      status: starStatus,
      evidence: 'Star field',
    },
    janmaRasi: {
      rawText: rasi,
      normalizedValue: rasi,
      status: rasiStatus,
      evidence: 'Rasi field',
    },
    lagna: {
      rawText: 'ரிஷபம்',
      normalizedValue: 'RISHABA',
      status: 'READABLE',
      evidence: 'Lagna',
    },
    marsPosition: {
      rasiSign: 'MIDHUNAM',
      status: 'READABLE',
      sourceChart: 'RASI',
      evidence: 'Mars in Gemini',
    },
    marsHouse: {
      value: 2,
      sourceChart: 'RASI',
      status: 'READABLE',
      evidence: 'House 2',
    },
    rasiChartPlanets: [],
    navamsamChartPlanets: [],
    imageQuality: 'GOOD',
    overallExtractionConfidence: 0.95,
    unreadableFields: [],
  };
}

describe('StarRasiRule (Rule 2)', () => {
  const rule = new StarRasiRule();

  describe('8 Allowed Combinations', () => {
    it('passes for மூலம் (MOOLA) + தனுசு (DHANUSU)', () => {
      const bride = createBrideWithStarRasi('மூலம்', 'தனுசு');
      const result = rule.evaluate(bride);
      expect(result.status).toBe('PASS');
      expect(result.message).toContain('match an allowed combination');
    });

    it('passes for சுவாதி (SWATHI) + துலாம் (THULA)', () => {
      const bride = createBrideWithStarRasi('சுவாதி', 'துலாம்');
      const result = rule.evaluate(bride);
      expect(result.status).toBe('PASS');
    });

    it('passes for கார்த்திகை (KARTHIGAI) + ரிஷபம் (RISHABA)', () => {
      const bride = createBrideWithStarRasi('கார்த்திகை', 'ரிஷபம்');
      const result = rule.evaluate(bride);
      expect(result.status).toBe('PASS');
    });

    it('passes for உத்திரம் (UTHIRAM) + கன்னி (KANNI)', () => {
      const bride = createBrideWithStarRasi('உத்திரம்', 'கன்னி');
      const result = rule.evaluate(bride);
      expect(result.status).toBe('PASS');
    });

    it('passes for அனுஷம் (ANUSHAM) + விருச்சகம் (VIRUCHAGAM)', () => {
      const bride = createBrideWithStarRasi('அனுஷம்', 'விருச்சகம்');
      const result = rule.evaluate(bride);
      expect(result.status).toBe('PASS');
    });

    it('passes for பூரம் (POORAM) + சிம்மம் (SIMMAM)', () => {
      const bride = createBrideWithStarRasi('பூரம்', 'சிம்மம்');
      const result = rule.evaluate(bride);
      expect(result.status).toBe('PASS');
    });

    it('passes for பூசம் (POOSAM) + கடகம் (KADAGAM)', () => {
      const bride = createBrideWithStarRasi('பூசம்', 'கடகம்');
      const result = rule.evaluate(bride);
      expect(result.status).toBe('PASS');
    });

    it('passes for அஸ்தம் (HASTHAM) + கன்னி (KANNI)', () => {
      const bride = createBrideWithStarRasi('அஸ்தம்', 'கன்னி');
      const result = rule.evaluate(bride);
      expect(result.status).toBe('PASS');
    });
  });

  describe('Invalid Combinations (FAIL)', () => {
    it('fails when Nakshatra is in allowed list but Rasi does not match (MOOLA + THULA)', () => {
      const bride = createBrideWithStarRasi('MOOLA', 'THULA');
      const result = rule.evaluate(bride);
      expect(result.status).toBe('FAIL');
      expect(result.message).toContain('Nakshatra MOOLA requires Rasi [DHANUSU');
    });

    it('fails for POORAM + KANNI', () => {
      const bride = createBrideWithStarRasi('POORAM', 'KANNI');
      const result = rule.evaluate(bride);
      expect(result.status).toBe('FAIL');
      expect(result.message).toContain('Nakshatra POORAM requires Rasi [SIMMAM');
    });

    it('fails for completely unrelated combination (ROHINI + RISHABA)', () => {
      const bride = createBrideWithStarRasi('ROHINI', 'RISHABA');
      const result = rule.evaluate(bride);
      expect(result.status).toBe('FAIL');
      expect(result.message).toContain('NOT in the allowed 8 combinations');
    });
  });

  describe('Uncertain or Missing Combinations (REVIEW)', () => {
    it('returns REVIEW for unknown star', () => {
      const bride = createBrideWithStarRasi('UNKNOWN_STAR_XYZ', 'DHANUSU');
      const result = rule.evaluate(bride);
      expect(result.status).toBe('REVIEW');
      expect(result.message).toContain('Unknown or unmapped Nakshatra');
    });

    it('returns REVIEW for missing/unreadable star', () => {
      const bride = createBrideWithStarRasi('', 'DHANUSU', 'UNREADABLE', 'READABLE');
      const result = rule.evaluate(bride);
      expect(result.status).toBe('REVIEW');
      expect(result.message).toContain('Janma Nakshatra (birth star) could not be reliably determined');
    });

    it('returns REVIEW for missing/unreadable Rasi', () => {
      const bride = createBrideWithStarRasi('MOOLA', '', 'READABLE', 'MISSING');
      const result = rule.evaluate(bride);
      expect(result.status).toBe('REVIEW');
      expect(result.message).toContain('Janma Rasi (moon sign) could not be reliably determined');
    });
  });
});
