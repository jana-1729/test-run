export type RuleStatus = 'PASS' | 'FAIL' | 'REVIEW';

export interface RuleResult {
  ruleName: string;
  status: RuleStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface MatchingDecision {
  overallStatus: RuleStatus;
  ruleResults: RuleResult[];
  reasons: string[];
  groomProfileVersion: number;
  groomProfileId?: string;
  brideSummary: {
    rawNakshatra?: string;
    normalizedNakshatra?: string;
    rawRasi?: string;
    normalizedRasi?: string;
    lagna?: string;
    marsSign?: string;
    marsHouse?: number | null;
  };
  evaluatedAt: Date;
}
