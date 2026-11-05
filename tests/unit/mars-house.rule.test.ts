import { describe, expect, it } from 'vitest';
import { MarsHouseRule } from '../../src/matching/rules/mars-house.rule.js';
import { JathagamExtraction } from '../../src/schemas/jathagam.schema.js';

function createBrideWithMarsHouse(
  lagnaSign: string,
  marsSign: string,
  marsHouseValue: number | null = null,
  lagnaStatus: 'READABLE' | 'AMBIGUOUS' | 'UNREADABLE' | 'MISSING' = 'READABLE',
  marsStatus: 'READABLE' | 'AMBIGUOUS' | 'UNREADABLE' | 'MISSING' = 'READABLE'
): JathagamExtraction {
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
      rawText: lagnaSign,
      normalizedValue: lagnaSign,
      status: lagnaStatus,
      evidence: 'Lagna',
    },
    marsPosition: {
      rasiSign: marsSign,
      status: marsStatus,
      sourceChart: 'RASI',
      evidence: 'Mars box',
    },
    marsHouse: {
      value: marsHouseValue,
      sourceChart: 'RASI',
      status: marsStatus,
      evidence: 'Derived Mars house',
    },
    rasiChartPlanets: [],
    navamsamChartPlanets: [],
    imageQuality: 'GOOD',
    overallExtractionConfidence: 0.95,
    unreadableFields: [],
  };
}

describe('MarsHouseRule (Rule 1)', () => {
  const rule = new MarsHouseRule();

  // Test all allowed houses: 2, 4, 7, 8, 12 relative to Lagna (using Lagna = MESHAM for direct sign mapping)
  it('passes for House 2', () => {
    // Mesham (1) -> Rishaba (2)
    const bride = createBrideWithMarsHouse('MESHAM', 'RISHABA', 2);
    const result = rule.evaluate(bride);
    expect(result.status).toBe('PASS');
    expect(result.message).toContain('Mars (Sevvai) is in allowed house 2');
  });

  it('passes for House 4', () => {
    // Mesham (1) -> Kadagam (4)
    const bride = createBrideWithMarsHouse('MESHAM', 'KADAGAM', 4);
    const result = rule.evaluate(bride);
    expect(result.status).toBe('PASS');
    expect(result.message).toContain('Mars (Sevvai) is in allowed house 4');
  });

  it('passes for House 7', () => {
    // Mesham (1) -> Thula (7)
    const bride = createBrideWithMarsHouse('MESHAM', 'THULA', 7);
    const result = rule.evaluate(bride);
    expect(result.status).toBe('PASS');
    expect(result.message).toContain('Mars (Sevvai) is in allowed house 7');
  });

  it('passes for House 8', () => {
    // Mesham (1) -> Viruchagam (8)
    const bride = createBrideWithMarsHouse('MESHAM', 'VIRUCHAGAM', 8);
    const result = rule.evaluate(bride);
    expect(result.status).toBe('PASS');
    expect(result.message).toContain('Mars (Sevvai) is in allowed house 8');
  });

  it('passes for House 12', () => {
    // Mesham (1) -> Meenam (12)
    const bride = createBrideWithMarsHouse('MESHAM', 'MEENAM', 12);
    const result = rule.evaluate(bride);
    expect(result.status).toBe('PASS');
    expect(result.message).toContain('Mars (Sevvai) is in allowed house 12');
  });

  // Test failing houses: 1, 3, 5, 6, 9, 10, 11
  it('fails for House 1', () => {
    const bride = createBrideWithMarsHouse('MESHAM', 'MESHAM', 1);
    const result = rule.evaluate(bride);
    expect(result.status).toBe('FAIL');
    expect(result.message).toContain('Mars (Sevvai) is in house 1, which is NOT in allowed houses');
  });

  it('fails for House 3', () => {
    const bride = createBrideWithMarsHouse('MESHAM', 'MIDHUNAM', 3);
    const result = rule.evaluate(bride);
    expect(result.status).toBe('FAIL');
    expect(result.message).toContain('Mars (Sevvai) is in house 3');
  });

  it('fails for House 5', () => {
    const bride = createBrideWithMarsHouse('MESHAM', 'SIMMAM', 5);
    const result = rule.evaluate(bride);
    expect(result.status).toBe('FAIL');
    expect(result.message).toContain('Mars (Sevvai) is in house 5');
  });

  it('fails for House 6', () => {
    const bride = createBrideWithMarsHouse('MESHAM', 'KANNI', 6);
    const result = rule.evaluate(bride);
    expect(result.status).toBe('FAIL');
    expect(result.message).toContain('Mars (Sevvai) is in house 6');
  });

  it('fails for House 9', () => {
    const bride = createBrideWithMarsHouse('MESHAM', 'DHANUSU', 9);
    const result = rule.evaluate(bride);
    expect(result.status).toBe('FAIL');
    expect(result.message).toContain('Mars (Sevvai) is in house 9');
  });

  it('fails for House 10', () => {
    const bride = createBrideWithMarsHouse('MESHAM', 'MAKARAM', 10);
    const result = rule.evaluate(bride);
    expect(result.status).toBe('FAIL');
    expect(result.message).toContain('Mars (Sevvai) is in house 10');
  });

  it('fails for House 11', () => {
    const bride = createBrideWithMarsHouse('MESHAM', 'KUMBAM', 11);
    const result = rule.evaluate(bride);
    expect(result.status).toBe('FAIL');
    expect(result.message).toContain('Mars (Sevvai) is in house 11');
  });

  // Uncertainty / Review cases
  it('returns REVIEW when Lagna cannot be reliably determined', () => {
    const bride = createBrideWithMarsHouse('UNKNOWN', 'RISHABA', null, 'UNREADABLE', 'READABLE');
    const result = rule.evaluate(bride);
    expect(result.status).toBe('REVIEW');
    expect(result.message).toContain('Bride Lagna could not be reliably determined');
  });

  it('returns REVIEW when Mars position is unreadable', () => {
    const bride = createBrideWithMarsHouse('MESHAM', '', null, 'READABLE', 'UNREADABLE');
    const result = rule.evaluate(bride);
    expect(result.status).toBe('REVIEW');
    expect(result.message).toContain('Mars (Sevvai) position could not be reliably identified');
  });

  it('returns REVIEW when extracted house contradicts calculated house', () => {
    // Calculated from MESHAM to RISHABA is House 2, but extracted says 7
    const bride = createBrideWithMarsHouse('MESHAM', 'RISHABA', 7);
    const result = rule.evaluate(bride);
    expect(result.status).toBe('REVIEW');
    expect(result.message).toContain('Chart discrepancy');
  });
});
