import { JathagamExtraction } from '../../schemas/jathagam.schema.js';
import { NormalizationService } from '../../services/normalization.service.js';
import { defaultMatchingConfig, MatchingConfig } from '../matching-config.js';
import { RuleResult } from '../result.types.js';
import { MatchingRule } from './rule.interface.js';

export class StarRasiRule implements MatchingRule {
  public readonly name = 'StarRasiCondition';
  public readonly description =
    'Bride Nakshatra and Rasi must match one of the 8 strictly allowed combinations';

  public evaluate(
    bride: JathagamExtraction,
    _groom?: JathagamExtraction,
    config: MatchingConfig = defaultMatchingConfig
  ): RuleResult {
    // 1. Check readability of Janma Nakshatra
    if (bride.janmaNakshatra.status !== 'READABLE' || !bride.janmaNakshatra.normalizedValue) {
      return {
        ruleName: this.name,
        status: 'REVIEW',
        message: 'Bride Janma Nakshatra (birth star) could not be reliably determined from the horoscope',
        details: {
          nakshatraStatus: bride.janmaNakshatra.status,
          rawText: bride.janmaNakshatra.rawText,
        },
      };
    }

    // 2. Check readability of Janma Rasi
    if (bride.janmaRasi.status !== 'READABLE' || !bride.janmaRasi.normalizedValue) {
      return {
        ruleName: this.name,
        status: 'REVIEW',
        message: 'Bride Janma Rasi (moon sign) could not be reliably determined from the horoscope',
        details: {
          rasiStatus: bride.janmaRasi.status,
          rawText: bride.janmaRasi.rawText,
        },
      };
    }

    // 3. Normalize values using deterministic normalizer
    const normalizedStar = NormalizationService.normalizeNakshatra(
      bride.janmaNakshatra.normalizedValue || bride.janmaNakshatra.rawText
    );
    const normalizedRasi = NormalizationService.normalizeRasi(
      bride.janmaRasi.normalizedValue || bride.janmaRasi.rawText
    );

    if (!normalizedStar) {
      return {
        ruleName: this.name,
        status: 'REVIEW',
        message: `Unknown or unmapped Nakshatra: "${bride.janmaNakshatra.rawText}". Manual verification required.`,
        details: {
          rawStar: bride.janmaNakshatra.rawText,
          normalizedCandidate: bride.janmaNakshatra.normalizedValue,
        },
      };
    }

    if (!normalizedRasi) {
      return {
        ruleName: this.name,
        status: 'REVIEW',
        message: `Unknown or unmapped Rasi: "${bride.janmaRasi.rawText}". Manual verification required.`,
        details: {
          rawRasi: bride.janmaRasi.rawText,
          normalizedCandidate: bride.janmaRasi.normalizedValue,
        },
      };
    }

    // 4. Check against allowed pairs
    const matchingPair = config.allowedPairs.find(
      (pair) => pair.nakshatra === normalizedStar && pair.rasi === normalizedRasi
    );

    if (matchingPair) {
      return {
        ruleName: this.name,
        status: 'PASS',
        message: `Nakshatra (${matchingPair.tamilNakshatra} / ${matchingPair.nakshatra}) and Rasi (${matchingPair.tamilRasi} / ${matchingPair.rasi}) match an allowed combination`,
        details: {
          matchedPair: matchingPair,
          nakshatra: normalizedStar,
          rasi: normalizedRasi,
        },
      };
    }

    // Check if star itself is in the allowed list but rasi didn't match
    const starMatchesAny = config.allowedPairs.filter((p) => p.nakshatra === normalizedStar);
    if (starMatchesAny.length > 0) {
      const expectedRasis = starMatchesAny.map((p) => `${p.rasi} (${p.tamilRasi})`).join(', ');
      return {
        ruleName: this.name,
        status: 'FAIL',
        message: `Nakshatra ${normalizedStar} requires Rasi [${expectedRasis}], but bride's Rasi is ${normalizedRasi}`,
        details: {
          nakshatra: normalizedStar,
          rasi: normalizedRasi,
          expectedRasis,
        },
      };
    }

    return {
      ruleName: this.name,
      status: 'FAIL',
      message: `Combination ${normalizedStar} + ${normalizedRasi} is NOT in the allowed 8 combinations`,
      details: {
        nakshatra: normalizedStar,
        rasi: normalizedRasi,
      },
    };
  }
}
