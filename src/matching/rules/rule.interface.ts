import { JathagamExtraction } from '../../schemas/jathagam.schema.js';
import { MatchingConfig } from '../matching-config.js';
import { RuleResult } from '../result.types.js';

export interface MatchingRule {
  readonly name: string;
  readonly description: string;
  evaluate(
    bride: JathagamExtraction,
    groom?: JathagamExtraction,
    config?: MatchingConfig
  ): RuleResult;
}
