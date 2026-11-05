import { JathagamExtraction } from '../schemas/jathagam.schema.js';
import { logger } from '../utils/logger.js';
import { defaultMatchingConfig, MatchingConfig } from './matching-config.js';
import { MatchingDecision, RuleResult, RuleStatus } from './result.types.js';
import { MarsHouseRule } from './rules/mars-house.rule.js';
import { MatchingRule } from './rules/rule.interface.js';
import { StarRasiRule } from './rules/star-rasi.rule.js';

export class MatchingEngine {
  private rules: MatchingRule[];
  private config: MatchingConfig;

  constructor(
    rules: MatchingRule[] = [new MarsHouseRule(), new StarRasiRule()],
    config: MatchingConfig = defaultMatchingConfig
  ) {
    this.rules = rules;
    this.config = config;
  }

  /**
   * Evaluates all mandatory matching rules against bride and reference groom profile.
   *
   * Decision precedence:
   * FAIL > REVIEW > PASS
   * If any rule fails, the overall outcome is FAIL even if another rule requires review.
   */
  public evaluate(
    bride: JathagamExtraction,
    groom?: JathagamExtraction,
    groomProfileVersion = 1,
    groomProfileId?: string
  ): MatchingDecision {
    const ruleResults: RuleResult[] = [];
    const reasons: string[] = [];

    for (const rule of this.rules) {
      try {
        const result = rule.evaluate(bride, groom, this.config);
        ruleResults.push(result);
        if (result.status !== 'PASS') {
          reasons.push(`[${result.ruleName}] ${result.message}`);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error({ rule: rule.name, err }, 'Unexpected error evaluating rule');
        ruleResults.push({
          ruleName: rule.name,
          status: 'REVIEW',
          message: `Rule evaluation error: ${errorMsg}`,
        });
        reasons.push(`[${rule.name}] Evaluation error: ${errorMsg}`);
      }
    }

    // Determine overall status using precedence: FAIL > REVIEW > PASS
    let overallStatus: RuleStatus = 'PASS';

    const hasFail = ruleResults.some((r) => r.status === 'FAIL');
    const hasReview = ruleResults.some((r) => r.status === 'REVIEW');

    if (hasFail) {
      overallStatus = 'FAIL';
    } else if (hasReview) {
      overallStatus = 'REVIEW';
    } else {
      overallStatus = 'PASS';
    }

    const decision: MatchingDecision = {
      overallStatus,
      ruleResults,
      reasons,
      groomProfileVersion,
      groomProfileId,
      brideSummary: {
        rawNakshatra: bride.janmaNakshatra.rawText,
        normalizedNakshatra: bride.janmaNakshatra.normalizedValue,
        rawRasi: bride.janmaRasi.rawText,
        normalizedRasi: bride.janmaRasi.normalizedValue,
        lagna: bride.lagna.normalizedValue || bride.lagna.rawText,
        marsSign: bride.marsPosition.rasiSign,
        marsHouse: bride.marsHouse.value,
      },
      evaluatedAt: new Date(),
    };

    logger.info(
      {
        overallStatus,
        groomProfileVersion,
        brideStar: decision.brideSummary.normalizedNakshatra,
        brideRasi: decision.brideSummary.normalizedRasi,
        brideMarsHouse: decision.brideSummary.marsHouse,
      },
      'Matching engine evaluation completed'
    );

    return decision;
  }
}
