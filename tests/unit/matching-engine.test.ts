import { describe, expect, it } from 'vitest';
import { MatchingEngine } from '../../src/matching/engine.js';
import { JathagamExtraction } from '../../src/schemas/jathagam.schema.js';

function buildBride(overrides: Partial<JathagamExtraction> = {}): JathagamExtraction {
  return {
    documentType: 'JATHAGAM',
    documentLanguage: 'TAMIL',
    isHoroscopeDocument: true,
    janmaNakshatra: {
      rawText: 'மூலம்',
      normalizedValue: 'MOOLA',
      status: 'READABLE',
      evidence: 'Birth star',
    },
    janmaRasi: {
      rawText: 'தனுசு',
      normalizedValue: 'DHANUSU',
      status: 'READABLE',
      evidence: 'Birth rasi',
    },
    lagna: {
      rawText: 'ரிஷபம்',
      normalizedValue: 'RISHABA',
      status: 'READABLE',
      evidence: 'Lagna',
    },
    marsPosition: {
      rasiSign: 'MIDHUNAM', // House 2 from Rishaba -> PASS
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
    ...overrides,
  };
}

describe('MatchingEngine (Precedence and Decision Logic)', () => {
  const engine = new MatchingEngine();

  it('evaluates to PASS when both rules pass', () => {
    // Mars: House 2 (allowed), Star: MOOLA + DHANUSU (allowed)
    const bride = buildBride();
    const decision = engine.evaluate(bride);
    expect(decision.overallStatus).toBe('PASS');
    expect(decision.ruleResults).toHaveLength(2);
    expect(decision.reasons).toHaveLength(0);
  });

  it('evaluates to FAIL when Mars fails even if star passes', () => {
    // Mars in Mesham from Rishaba = House 12? Wait: Rishaba (1), Mesham (12).
    // Let's set Mars in Midhunam from Midhunam = House 1 (FAIL)
    const bride = buildBride({
      lagna: { rawText: 'MESHAM', normalizedValue: 'MESHAM', status: 'READABLE', evidence: '' },
      marsPosition: {
        rasiSign: 'MESHAM',
        status: 'READABLE',
        sourceChart: 'RASI',
        evidence: '',
      },
      marsHouse: { value: 1, sourceChart: 'RASI', status: 'READABLE', evidence: '' },
    });
    const decision = engine.evaluate(bride);
    expect(decision.overallStatus).toBe('FAIL');
    expect(decision.reasons.some((r) => r.includes('MarsHouseCondition'))).toBe(true);
  });

  it('evaluates to FAIL when Mars passes but star fails', () => {
    const bride = buildBride({
      janmaNakshatra: {
        rawText: 'உத்திராடம்',
        normalizedValue: 'UTHIRADAM',
        status: 'READABLE',
        evidence: '',
      },
      janmaRasi: {
        rawText: 'மகரம்',
        normalizedValue: 'MAKARAM',
        status: 'READABLE',
        evidence: '',
      },
    });
    const decision = engine.evaluate(bride);
    expect(decision.overallStatus).toBe('FAIL');
    expect(decision.reasons.some((r) => r.includes('StarRasiCondition'))).toBe(true);
  });

  it('evaluates to FAIL when both rules fail', () => {
    const bride = buildBride({
      // Mars house 1 (FAIL)
      lagna: { rawText: 'MESHAM', normalizedValue: 'MESHAM', status: 'READABLE', evidence: '' },
      marsPosition: {
        rasiSign: 'MESHAM',
        status: 'READABLE',
        sourceChart: 'RASI',
        evidence: '',
      },
      marsHouse: { value: 1, sourceChart: 'RASI', status: 'READABLE', evidence: '' },
      // Star & Rasi fail
      janmaNakshatra: {
        rawText: 'ROHINI',
        normalizedValue: 'ROHINI',
        status: 'READABLE',
        evidence: '',
      },
    });
    const decision = engine.evaluate(bride);
    expect(decision.overallStatus).toBe('FAIL');
    expect(decision.ruleResults.filter((r) => r.status === 'FAIL')).toHaveLength(2);
  });

  it('evaluates to FAIL when one rule fails and the other requires REVIEW (Precedence: FAIL > REVIEW)', () => {
    const bride = buildBride({
      // Mars is unreadable -> REVIEW
      marsPosition: {
        rasiSign: '',
        status: 'UNREADABLE',
        sourceChart: 'RASI',
        evidence: '',
      },
      // Star & Rasi definitely fails (e.g. ROHINI + RISHABA)
      janmaNakshatra: {
        rawText: 'ROHINI',
        normalizedValue: 'ROHINI',
        status: 'READABLE',
        evidence: '',
      },
    });
    const decision = engine.evaluate(bride);
    // Precedence rule: FAIL > REVIEW > PASS
    expect(decision.overallStatus).toBe('FAIL');
    expect(decision.ruleResults.some((r) => r.status === 'FAIL')).toBe(true);
    expect(decision.ruleResults.some((r) => r.status === 'REVIEW')).toBe(true);
  });

  it('evaluates to REVIEW when one rule passes and the other requires REVIEW', () => {
    const bride = buildBride({
      // Star & Rasi passes (MOOLA + DHANUSU)
      // Mars is unreadable -> REVIEW
      marsPosition: {
        rasiSign: '',
        status: 'UNREADABLE',
        sourceChart: 'RASI',
        evidence: '',
      },
    });
    const decision = engine.evaluate(bride);
    expect(decision.overallStatus).toBe('REVIEW');
  });

  it('evaluates to REVIEW when both rules require REVIEW', () => {
    const bride = buildBride({
      lagna: { rawText: '', normalizedValue: '', status: 'UNREADABLE', evidence: '' },
      janmaNakshatra: { rawText: '', normalizedValue: '', status: 'UNREADABLE', evidence: '' },
    });
    const decision = engine.evaluate(bride);
    expect(decision.overallStatus).toBe('REVIEW');
  });
});
