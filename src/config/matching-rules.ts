export const MATCHING_RULES_VERSION = '1.0.0';

/**
 * Rule 1: Mars House Condition
 * செவ்வாய் 2, 4, 7, 8, 12-ல் வேண்டும்
 */
export const ALLOWED_MARS_HOUSES = [2, 4, 7, 8, 12] as const;
export type AllowedMarsHouse = (typeof ALLOWED_MARS_HOUSES)[number];

/**
 * Rule 2: Allowed Nakshatra and Rasi Combinations
 * இவை மட்டும் பொருந்தும் (Exactly these 8 pairs)
 */
export interface AllowedPair {
  readonly tamilNakshatra: string;
  readonly nakshatra: string;
  readonly tamilRasi: string;
  readonly rasi: string;
}

export const ALLOWED_NAKSHATRA_RASI_PAIRS: readonly AllowedPair[] = [
  { tamilNakshatra: 'மூலம்', nakshatra: 'MOOLA', tamilRasi: 'தனுசு', rasi: 'DHANUSU' },
  { tamilNakshatra: 'சுவாதி', nakshatra: 'SWATHI', tamilRasi: 'துலாம்', rasi: 'THULA' },
  { tamilNakshatra: 'கார்த்திகை', nakshatra: 'KARTHIGAI', tamilRasi: 'ரிஷபம்', rasi: 'RISHABA' },
  { tamilNakshatra: 'உத்திரம்', nakshatra: 'UTHIRAM', tamilRasi: 'கன்னி', rasi: 'KANNI' },
  { tamilNakshatra: 'அனுஷம்', nakshatra: 'ANUSHAM', tamilRasi: 'விருச்சகம்', rasi: 'VIRUCHAGAM' },
  { tamilNakshatra: 'பூரம்', nakshatra: 'POORAM', tamilRasi: 'சிம்மம்', rasi: 'SIMMAM' },
  { tamilNakshatra: 'பூசம்', nakshatra: 'POOSAM', tamilRasi: 'கடகம்', rasi: 'KADAGAM' },
  { tamilNakshatra: 'அஸ்தம்', nakshatra: 'HASTHAM', tamilRasi: 'கன்னி', rasi: 'KANNI' },
] as const;

export interface MatchingConfig {
  readonly version: string;
  readonly authoritativeChart: 'RASI' | 'NAVAMSAM';
  readonly allowedMarsHouses: readonly number[];
  readonly allowedPairs: readonly AllowedPair[];
}

export const defaultMatchingConfig: MatchingConfig = {
  version: MATCHING_RULES_VERSION,
  authoritativeChart: 'RASI',
  allowedMarsHouses: ALLOWED_MARS_HOUSES,
  allowedPairs: ALLOWED_NAKSHATRA_RASI_PAIRS,
};
