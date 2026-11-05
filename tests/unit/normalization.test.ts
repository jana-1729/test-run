import { describe, expect, it } from 'vitest';
import { NormalizationService } from '../../src/services/normalization.service.js';

describe('NormalizationService', () => {
  describe('normalizeRasi', () => {
    it('normalizes Tamil Rasis correctly', () => {
      expect(NormalizationService.normalizeRasi('மேஷம்')).toBe('MESHAM');
      expect(NormalizationService.normalizeRasi('ரிஷபம்')).toBe('RISHABA');
      expect(NormalizationService.normalizeRasi('மிதுனம்')).toBe('MIDHUNAM');
      expect(NormalizationService.normalizeRasi('கடகம்')).toBe('KADAGAM');
      expect(NormalizationService.normalizeRasi('சிம்மம்')).toBe('SIMMAM');
      expect(NormalizationService.normalizeRasi('கன்னி')).toBe('KANNI');
      expect(NormalizationService.normalizeRasi('துலாம்')).toBe('THULA');
      expect(NormalizationService.normalizeRasi('துலா')).toBe('THULA');
      expect(NormalizationService.normalizeRasi('விருச்சிகம்')).toBe('VIRUCHAGAM');
      expect(NormalizationService.normalizeRasi('விருச்சகம்')).toBe('VIRUCHAGAM');
      expect(NormalizationService.normalizeRasi('தனுசு')).toBe('DHANUSU');
      expect(NormalizationService.normalizeRasi('தனுஸ்')).toBe('DHANUSU');
      expect(NormalizationService.normalizeRasi('மகரம்')).toBe('MAKARAM');
      expect(NormalizationService.normalizeRasi('கும்பம்')).toBe('KUMBAM');
      expect(NormalizationService.normalizeRasi('மீனம்')).toBe('MEENAM');
    });

    it('normalizes English Rasis and aliases correctly', () => {
      expect(NormalizationService.normalizeRasi('Dhanusu')).toBe('DHANUSU');
      expect(NormalizationService.normalizeRasi('Thulam')).toBe('THULA');
      expect(NormalizationService.normalizeRasi('Tula')).toBe('THULA');
      expect(NormalizationService.normalizeRasi('Rishaba')).toBe('RISHABA');
      expect(NormalizationService.normalizeRasi('Vrishabha')).toBe('RISHABA');
      expect(NormalizationService.normalizeRasi('Kanni')).toBe('KANNI');
      expect(NormalizationService.normalizeRasi('Viruchigam')).toBe('VIRUCHAGAM');
      expect(NormalizationService.normalizeRasi('Simha')).toBe('SIMMAM');
      expect(NormalizationService.normalizeRasi('Kadagam')).toBe('KADAGAM');
      expect(NormalizationService.normalizeRasi('Makara')).toBe('MAKARAM');
    });

    it('returns null for unrecognized Rasi strings', () => {
      expect(NormalizationService.normalizeRasi('XYZ_INVALID')).toBeNull();
      expect(NormalizationService.normalizeRasi('')).toBeNull();
    });
  });

  describe('normalizeNakshatra', () => {
    it('normalizes the 8 mandatory matching stars correctly in Tamil and English', () => {
      // 1. Moola
      expect(NormalizationService.normalizeNakshatra('மூலம்')).toBe('MOOLA');
      expect(NormalizationService.normalizeNakshatra('Moolam')).toBe('MOOLA');
      expect(NormalizationService.normalizeNakshatra('Moola')).toBe('MOOLA');

      // 2. Swathi
      expect(NormalizationService.normalizeNakshatra('சுவாதி')).toBe('SWATHI');
      expect(NormalizationService.normalizeNakshatra('Swathi')).toBe('SWATHI');
      expect(NormalizationService.normalizeNakshatra('Swati')).toBe('SWATHI');

      // 3. Karthigai
      expect(NormalizationService.normalizeNakshatra('கார்த்திகை')).toBe('KARTHIGAI');
      expect(NormalizationService.normalizeNakshatra('Karthigai')).toBe('KARTHIGAI');
      expect(NormalizationService.normalizeNakshatra('Krithika')).toBe('KARTHIGAI');

      // 4. Uthiram
      expect(NormalizationService.normalizeNakshatra('உத்திரம்')).toBe('UTHIRAM');
      expect(NormalizationService.normalizeNakshatra('Uthiram')).toBe('UTHIRAM');
      expect(NormalizationService.normalizeNakshatra('Uttara Phalguni')).toBe('UTHIRAM');

      // 5. Anusham
      expect(NormalizationService.normalizeNakshatra('அனுஷம்')).toBe('ANUSHAM');
      expect(NormalizationService.normalizeNakshatra('அனுசம்')).toBe('ANUSHAM');
      expect(NormalizationService.normalizeNakshatra('Anusham')).toBe('ANUSHAM');
      expect(NormalizationService.normalizeNakshatra('Anuradha')).toBe('ANUSHAM');

      // 6. Pooram
      expect(NormalizationService.normalizeNakshatra('பூரம்')).toBe('POORAM');
      expect(NormalizationService.normalizeNakshatra('Pooram')).toBe('POORAM');
      expect(NormalizationService.normalizeNakshatra('Purva Phalguni')).toBe('POORAM');

      // 7. Poosam
      expect(NormalizationService.normalizeNakshatra('பூசம்')).toBe('POOSAM');
      expect(NormalizationService.normalizeNakshatra('Poosam')).toBe('POOSAM');
      expect(NormalizationService.normalizeNakshatra('Pushya')).toBe('POOSAM');

      // 8. Hastham
      expect(NormalizationService.normalizeNakshatra('அஸ்தம்')).toBe('HASTHAM');
      expect(NormalizationService.normalizeNakshatra('ஹஸ்தம்')).toBe('HASTHAM');
      expect(NormalizationService.normalizeNakshatra('Hastham')).toBe('HASTHAM');
      expect(NormalizationService.normalizeNakshatra('Astham')).toBe('HASTHAM');
    });

    it('strips pada information cleanly', () => {
      expect(NormalizationService.normalizeNakshatra('உத்திராடம் பாதம் 2')).toBe('UTHIRADAM');
      expect(NormalizationService.normalizeNakshatra('மூலம் பாதம் 4')).toBe('MOOLA');
      expect(NormalizationService.normalizeNakshatra('Swathi Pada 1')).toBe('SWATHI');
    });

    it('returns null for unknown star names', () => {
      expect(NormalizationService.normalizeNakshatra('RandomStar')).toBeNull();
      expect(NormalizationService.normalizeNakshatra('')).toBeNull();
    });
  });

  describe('calculateHouseFromLagna', () => {
    it('calculates house numbers correctly in cyclical zodiac', () => {
      // Lagna Rishaba (Taurus = 1), Mars Midhunam (Gemini = 2) => House 2
      expect(NormalizationService.calculateHouseFromLagna('RISHABA', 'MIDHUNAM')).toBe(2);

      // Lagna Rishaba (1), Mars Simmam (Leo = 4) => House 4
      expect(NormalizationService.calculateHouseFromLagna('RISHABA', 'SIMMAM')).toBe(4);

      // Lagna Rishaba (1), Mars Viruchagam (Scorpio = 7) => House 7
      expect(NormalizationService.calculateHouseFromLagna('RISHABA', 'VIRUCHAGAM')).toBe(7);

      // Lagna Rishaba (1), Mars Dhanusu (Sagittarius = 8) => House 8
      expect(NormalizationService.calculateHouseFromLagna('RISHABA', 'DHANUSU')).toBe(8);

      // Lagna Rishaba (1), Mars Mesham (Aries = 0) => House 12
      expect(NormalizationService.calculateHouseFromLagna('RISHABA', 'MESHAM')).toBe(12);

      // Lagna Kadagam (Cancer = 3), Mars Midhunam (Gemini = 2) => House 12
      expect(NormalizationService.calculateHouseFromLagna('KADAGAM', 'MIDHUNAM')).toBe(12);

      // Lagna Mesham (0), Mars Mesham (0) => House 1
      expect(NormalizationService.calculateHouseFromLagna('MESHAM', 'MESHAM')).toBe(1);
    });
  });
});
