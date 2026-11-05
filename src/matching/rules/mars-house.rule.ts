import { JathagamExtraction } from '../../schemas/jathagam.schema.js';
import { NormalizationService, ZodiacSign } from '../../services/normalization.service.js';
import { defaultMatchingConfig, MatchingConfig } from '../matching-config.js';
import { RuleResult } from '../result.types.js';
import { MatchingRule } from './rule.interface.js';

export class MarsHouseRule implements MatchingRule {
  public readonly name = 'MarsHouseCondition';
  public readonly description =
    'Mars (Sevvai) must be positioned in the 2nd, 4th, 7th, 8th, or 12th house relative to bride Lagna';

  public evaluate(
    bride: JathagamExtraction,
    _groom?: JathagamExtraction,
    config: MatchingConfig = defaultMatchingConfig
  ): RuleResult {
    const allowedHouses = config.allowedMarsHouses;

    // Check if bride Lagna or Mars placement is missing or unreadable
    if (bride.lagna.status !== 'READABLE' || !bride.lagna.normalizedValue) {
      return {
        ruleName: this.name,
        status: 'REVIEW',
        message: 'Bride Lagna could not be reliably determined from the horoscope chart',
        details: { lagnaStatus: bride.lagna.status, rawLagna: bride.lagna.rawText },
      };
    }

    if (bride.marsPosition.status !== 'READABLE' || !bride.marsPosition.rasiSign) {
      return {
        ruleName: this.name,
        status: 'REVIEW',
        message: 'Bride Mars (Sevvai) position could not be reliably identified from the chart',
        details: {
          marsStatus: bride.marsPosition.status,
          rawMarsRasi: bride.marsPosition.rasiSign,
        },
      };
    }

    // Normalize Lagna and Mars sign
    const normalizedLagna = NormalizationService.normalizeRasi(bride.lagna.normalizedValue);
    const normalizedMarsSign = NormalizationService.normalizeRasi(bride.marsPosition.rasiSign);

    if (!normalizedLagna || !normalizedMarsSign) {
      return {
        ruleName: this.name,
        status: 'REVIEW',
        message: `Unable to normalize Lagna (${bride.lagna.normalizedValue}) or Mars sign (${bride.marsPosition.rasiSign})`,
        details: {
          lagna: bride.lagna.normalizedValue,
          marsSign: bride.marsPosition.rasiSign,
        },
      };
    }

    // Deterministically calculate house from Lagna using the authoritative chart
    const calculatedHouse = NormalizationService.calculateHouseFromLagna(
      normalizedLagna as ZodiacSign,
      normalizedMarsSign as ZodiacSign
    );

    if (calculatedHouse === null) {
      return {
        ruleName: this.name,
        status: 'REVIEW',
        message: 'Could not calculate Mars house relative to Lagna',
        details: { normalizedLagna, normalizedMarsSign },
      };
    }

    // Cross-verify with Gemini-extracted house if present and readable
    if (
      bride.marsHouse.status === 'READABLE' &&
      bride.marsHouse.value !== null &&
      bride.marsHouse.value !== calculatedHouse
    ) {
      return {
        ruleName: this.name,
        status: 'REVIEW',
        message: `Chart discrepancy: Extracted Mars house (${bride.marsHouse.value}) does not match calculated house (${calculatedHouse}) from Lagna ${normalizedLagna} and Mars in ${normalizedMarsSign}`,
        details: {
          extractedHouse: bride.marsHouse.value,
          calculatedHouse,
          lagna: normalizedLagna,
          marsSign: normalizedMarsSign,
        },
      };
    }

    const finalMarsHouse = calculatedHouse;

    if (allowedHouses.includes(finalMarsHouse)) {
      return {
        ruleName: this.name,
        status: 'PASS',
        message: `Mars (Sevvai) is in allowed house ${finalMarsHouse} relative to Lagna (${normalizedLagna})`,
        details: {
          marsHouse: finalMarsHouse,
          allowedHouses,
          lagna: normalizedLagna,
          marsSign: normalizedMarsSign,
        },
      };
    }

    return {
      ruleName: this.name,
      status: 'FAIL',
      message: `Mars (Sevvai) is in house ${finalMarsHouse}, which is NOT in allowed houses [${allowedHouses.join(', ')}]`,
      details: {
        marsHouse: finalMarsHouse,
        allowedHouses,
        lagna: normalizedLagna,
        marsSign: normalizedMarsSign,
      },
    };
  }
}
