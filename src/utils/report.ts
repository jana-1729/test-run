import { MatchingDecision } from '../matching/result.types.js';
import { JathagamExtraction } from '../schemas/jathagam.schema.js';

export class ReportGenerator {
  /**
   * Generates a clean, professional plain-text report for Telegram matching announcements.
   */
  public static generateMatchReport(
    decision: MatchingDecision,
    brideData: JathagamExtraction
  ): string {
    const statusEmoji = decision.overallStatus === 'PASS' ? '✅' : decision.overallStatus === 'FAIL' ? '❌' : '⚠️';
    const lines: string[] = [];

    lines.push(`🌟 *JATHAGAM MATCH RESULT* ${statusEmoji}`);
    lines.push(`*Status:* ${decision.overallStatus}`);
    lines.push('');

    // Bride Horoscope Summary
    lines.push('👰 *BRIDE HOROSCOPE DETAILS*');
    if (brideData.nativeName) {
      lines.push(`• *Name:* ${brideData.nativeName}`);
    }
    const starDisplay = brideData.janmaNakshatra.rawText
      ? `${brideData.janmaNakshatra.rawText} (${brideData.janmaNakshatra.normalizedValue})`
      : brideData.janmaNakshatra.normalizedValue || 'Unknown';
    lines.push(`• *Nakshatra:* ${starDisplay}`);

    const rasiDisplay = brideData.janmaRasi.rawText
      ? `${brideData.janmaRasi.rawText} (${brideData.janmaRasi.normalizedValue})`
      : brideData.janmaRasi.normalizedValue || 'Unknown';
    lines.push(`• *Rasi:* ${rasiDisplay}`);

    const lagnaDisplay = brideData.lagna.rawText
      ? `${brideData.lagna.rawText} (${brideData.lagna.normalizedValue})`
      : brideData.lagna.normalizedValue || 'Unknown';
    lines.push(`• *Lagna:* ${lagnaDisplay}`);

    const marsHouseDisplay =
      decision.brideSummary.marsHouse !== null && decision.brideSummary.marsHouse !== undefined
        ? `House ${decision.brideSummary.marsHouse}`
        : 'Not identified';
    lines.push(`• *Mars (Sevvai) House:* ${marsHouseDisplay}`);
    lines.push('');

    // Matching conditions evaluation
    lines.push('📋 *MATCHING CONDITIONS EVALUATION*');

    // Rule 1: Mars House
    const marsRule = decision.ruleResults.find((r) => r.ruleName === 'MarsHouseCondition');
    const marsEmoji = marsRule?.status === 'PASS' ? '✅' : marsRule?.status === 'FAIL' ? '❌' : '⚠️';
    lines.push(`1. *Mars House Condition* ${marsEmoji}`);
    lines.push(`   • Mars House: ${decision.brideSummary.marsHouse ?? 'N/A'}`);
    lines.push('   • Allowed Houses: 2, 4, 7, 8, 12');
    lines.push(`   • Result: *${marsRule?.status ?? 'REVIEW'}*`);
    if (marsRule?.message) {
      lines.push(`   • Details: ${marsRule.message}`);
    }
    lines.push('');

    // Rule 2: Star + Rasi
    const starRule = decision.ruleResults.find((r) => r.ruleName === 'StarRasiCondition');
    const starEmoji = starRule?.status === 'PASS' ? '✅' : starRule?.status === 'FAIL' ? '❌' : '⚠️';
    lines.push(`2. *Star + Rasi Condition* ${starEmoji}`);
    lines.push(`   • Star: ${decision.brideSummary.normalizedNakshatra ?? 'N/A'}`);
    lines.push(`   • Rasi: ${decision.brideSummary.normalizedRasi ?? 'N/A'}`);
    lines.push(`   • Result: *${starRule?.status ?? 'REVIEW'}*`);
    if (starRule?.message) {
      lines.push(`   • Details: ${starRule.message}`);
    }
    lines.push('');

    // Final Decision
    const decisionText =
      decision.overallStatus === 'PASS'
        ? 'MATCHED & FORWARDED'
        : decision.overallStatus === 'FAIL'
          ? 'NOT MATCHED'
          : 'MANUAL REVIEW REQUIRED';

    lines.push(`*Final Decision:* *${decisionText}*`);
    lines.push(`_Groom Profile Version: v${decision.groomProfileVersion}_`);

    return lines.join('\n');
  }

  /**
   * Generates a concise summary for groom profile inspection.
   */
  public static generateGroomSummary(
    data: JathagamExtraction,
    version: number,
    active: boolean
  ): string {
    const lines: string[] = [];
    lines.push(`👤 *FIXED GROOM JATHAGAM PROFILE (v${version})*`);
    lines.push(`*Active Status:* ${active ? '🟢 ACTIVE' : '⚪ INACTIVE'}`);
    lines.push('');
    if (data.nativeName) lines.push(`• *Name:* ${data.nativeName}`);
    if (data.dateOfBirth) lines.push(`• *DOB:* ${data.dateOfBirth}`);
    if (data.timeOfBirth) lines.push(`• *Time:* ${data.timeOfBirth}`);
    if (data.placeOfBirth) lines.push(`• *Place:* ${data.placeOfBirth}`);
    lines.push(`• *Nakshatra:* ${data.janmaNakshatra.rawText} (${data.janmaNakshatra.normalizedValue})`);
    lines.push(`• *Rasi:* ${data.janmaRasi.rawText} (${data.janmaRasi.normalizedValue})`);
    lines.push(`• *Lagna:* ${data.lagna.rawText} (${data.lagna.normalizedValue})`);
    lines.push(
      `• *Mars (Sevvai) House:* ${data.marsHouse.value ? `House ${data.marsHouse.value}` : 'N/A'}`
    );
    lines.push('');
    lines.push(`_Model: ${data.geminiModel ?? 'Gemini'} | Confidence: ${((data.overallExtractionConfidence ?? 1) * 100).toFixed(0)}%_`);

    return lines.join('\n');
  }
}
