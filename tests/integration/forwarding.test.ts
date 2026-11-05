import { describe, expect, it, vi } from 'vitest';
import { MatchingDecision } from '../../src/matching/result.types.js';
import { JathagamExtraction } from '../../src/schemas/jathagam.schema.js';
import { ForwardingService } from '../../src/services/forwarding.service.js';

function createMockBride(): JathagamExtraction {
  return {
    documentType: 'JATHAGAM',
    documentLanguage: 'TAMIL',
    isHoroscopeDocument: true,
    nativeName: 'Bride A',
    janmaNakshatra: {
      rawText: 'மூலம்',
      normalizedValue: 'MOOLA',
      status: 'READABLE',
      evidence: '',
    },
    janmaRasi: {
      rawText: 'தனுசு',
      normalizedValue: 'DHANUSU',
      status: 'READABLE',
      evidence: '',
    },
    lagna: {
      rawText: 'ரிஷபம்',
      normalizedValue: 'RISHABA',
      status: 'READABLE',
      evidence: '',
    },
    marsPosition: {
      rasiSign: 'MIDHUNAM',
      status: 'READABLE',
      sourceChart: 'RASI',
      evidence: '',
    },
    marsHouse: { value: 2, sourceChart: 'RASI', status: 'READABLE', evidence: '' },
    rasiChartPlanets: [],
    navamsamChartPlanets: [],
    imageQuality: 'GOOD',
    overallExtractionConfidence: 0.95,
    unreadableFields: [],
  };
}

describe('ForwardingService', () => {
  it('forwards message and posts match report when decision is PASS', async () => {
    const forwardMessageMock = vi.fn().mockResolvedValue({ message_id: 888 });
    const sendMessageMock = vi.fn().mockResolvedValue({ message_id: 889 });

    const mockBot = {
      api: {
        forwardMessage: forwardMessageMock,
        sendMessage: sendMessageMock,
      },
    } as any;

    const forwardingService = new ForwardingService(mockBot);

    const decision: MatchingDecision = {
      overallStatus: 'PASS',
      ruleResults: [
        { ruleName: 'MarsHouseCondition', status: 'PASS', message: 'Mars in House 2' },
        { ruleName: 'StarRasiCondition', status: 'PASS', message: 'MOOLA + DHANUSU match' },
      ],
      reasons: [],
      groomProfileVersion: 1,
      brideSummary: {
        rawNakshatra: 'மூலம்',
        normalizedNakshatra: 'MOOLA',
        rawRasi: 'தனுசு',
        normalizedRasi: 'DHANUSU',
        lagna: 'RISHABA',
        marsHouse: 2,
      },
      evaluatedAt: new Date(),
    };

    const res = await forwardingService.handleDecisionOutcome(
      decision,
      createMockBride(),
      '-1001111111111',
      501,
      false
    );

    expect(res.forwarded).toBe(true);
    expect(res.destinationMessageId).toBe(888);
    expect(forwardMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('JATHAGAM MATCH RESULT'),
      expect.anything()
    );
  });

  it('does NOT forward when decision is FAIL', async () => {
    const forwardMessageMock = vi.fn();
    const sendMessageMock = vi.fn();

    const mockBot = {
      api: {
        forwardMessage: forwardMessageMock,
        sendMessage: sendMessageMock,
      },
    } as any;

    const forwardingService = new ForwardingService(mockBot);

    const decision: MatchingDecision = {
      overallStatus: 'FAIL',
      ruleResults: [
        { ruleName: 'StarRasiCondition', status: 'FAIL', message: 'Pair not allowed' },
      ],
      reasons: ['Pair not allowed'],
      groomProfileVersion: 1,
      brideSummary: { marsHouse: 1 },
      evaluatedAt: new Date(),
    };

    const res = await forwardingService.handleDecisionOutcome(
      decision,
      createMockBride(),
      '-1001111111111',
      502,
      false
    );

    expect(res.forwarded).toBe(false);
    expect(forwardMessageMock).not.toHaveBeenCalled();
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('does NOT forward when decision is REVIEW, and notifies admins', async () => {
    const forwardMessageMock = vi.fn();
    const sendMessageMock = vi.fn().mockResolvedValue({ message_id: 999 });

    const mockBot = {
      api: {
        forwardMessage: forwardMessageMock,
        sendMessage: sendMessageMock,
      },
    } as any;

    const forwardingService = new ForwardingService(mockBot);

    const decision: MatchingDecision = {
      overallStatus: 'REVIEW',
      ruleResults: [
        { ruleName: 'MarsHouseCondition', status: 'REVIEW', message: 'Lagna is unreadable' },
      ],
      reasons: ['Lagna is unreadable'],
      groomProfileVersion: 1,
      brideSummary: {},
      evaluatedAt: new Date(),
    };

    const res = await forwardingService.handleDecisionOutcome(
      decision,
      createMockBride(),
      '-1001111111111',
      503,
      false
    );

    expect(res.forwarded).toBe(false);
    expect(forwardMessageMock).not.toHaveBeenCalled();
    // Should have sent notifications to admin IDs
    expect(sendMessageMock).toHaveBeenCalled();
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.any(Number),
      expect.stringContaining('MANUAL REVIEW REQUIRED'),
      expect.anything()
    );
  });

  it('skips duplicate forward if alreadyForwarded is true', async () => {
    const forwardMessageMock = vi.fn();
    const mockBot = {
      api: { forwardMessage: forwardMessageMock },
    } as any;

    const forwardingService = new ForwardingService(mockBot);

    const decision: MatchingDecision = {
      overallStatus: 'PASS',
      ruleResults: [],
      reasons: [],
      groomProfileVersion: 1,
      brideSummary: {},
      evaluatedAt: new Date(),
    };

    const res = await forwardingService.handleDecisionOutcome(
      decision,
      createMockBride(),
      '-1001111111111',
      504,
      true // already forwarded!
    );

    expect(res.forwarded).toBe(true);
    expect(forwardMessageMock).not.toHaveBeenCalled();
  });
});
