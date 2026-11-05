import { logger } from '../utils/logger.js';

export const ZODIAC_SIGNS_ORDER = [
  'MESHAM',
  'RISHABA',
  'MIDHUNAM',
  'KADAGAM',
  'SIMMAM',
  'KANNI',
  'THULA',
  'VIRUCHAGAM',
  'DHANUSU',
  'MAKARAM',
  'KUMBAM',
  'MEENAM',
] as const;

export type ZodiacSign = (typeof ZODIAC_SIGNS_ORDER)[number];

const RASI_ALIASES: Record<string, ZodiacSign> = {
  // Mesham (Aries)
  மேஷம்: 'MESHAM',
  மேசம்: 'MESHAM',
  mesham: 'MESHAM',
  mesha: 'MESHAM',
  aries: 'MESHAM',

  // Rishaba (Taurus)
  ரிஷபம்: 'RISHABA',
  ரிசபம்: 'RISHABA',
  rishabam: 'RISHABA',
  rishaba: 'RISHABA',
  rishab: 'RISHABA',
  vrishabha: 'RISHABA',
  vrishab: 'RISHABA',
  taurus: 'RISHABA',

  // Midhunam (Gemini)
  மிதுனம்: 'MIDHUNAM',
  மிதுன: 'MIDHUNAM',
  midhunam: 'MIDHUNAM',
  mithunam: 'MIDHUNAM',
  midhuna: 'MIDHUNAM',
  mithuna: 'MIDHUNAM',
  gemini: 'MIDHUNAM',

  // Kadagam (Cancer)
  கடகம்: 'KADAGAM',
  கடக: 'KADAGAM',
  kadagam: 'KADAGAM',
  katakam: 'KADAGAM',
  kataka: 'KADAGAM',
  karkataka: 'KADAGAM',
  karkatakam: 'KADAGAM',
  cancer: 'KADAGAM',

  // Simmam (Leo)
  சிம்மம்: 'SIMMAM',
  சிம்ம: 'SIMMAM',
  simmam: 'SIMMAM',
  simha: 'SIMMAM',
  singam: 'SIMMAM',
  leo: 'SIMMAM',

  // Kanni (Virgo)
  கன்னி: 'KANNI',
  kanni: 'KANNI',
  kanya: 'KANNI',
  virgo: 'KANNI',

  // Thula (Libra)
  துலாம்: 'THULA',
  துலா: 'THULA',
  துல: 'THULA',
  thulam: 'THULA',
  thula: 'THULA',
  tula: 'THULA',
  tulam: 'THULA',
  libra: 'THULA',

  // Viruchagam (Scorpio)
  விருச்சிகம்: 'VIRUCHAGAM',
  விருச்சகம்: 'VIRUCHAGAM',
  விருச்சிக: 'VIRUCHAGAM',
  விருச்சக: 'VIRUCHAGAM',
  viruchagam: 'VIRUCHAGAM',
  viruchigam: 'VIRUCHAGAM',
  vrischika: 'VIRUCHAGAM',
  vrischikam: 'VIRUCHAGAM',
  scorpio: 'VIRUCHAGAM',

  // Dhanusu (Sagittarius)
  தனுசு: 'DHANUSU',
  தனுஸ்: 'DHANUSU',
  தனுஷ: 'DHANUSU',
  dhanusu: 'DHANUSU',
  dhanus: 'DHANUSU',
  dhanush: 'DHANUSU',
  sagittarius: 'DHANUSU',

  // Makaram (Capricorn)
  மகரம்: 'MAKARAM',
  மகர: 'MAKARAM',
  makaram: 'MAKARAM',
  makara: 'MAKARAM',
  capricorn: 'MAKARAM',

  // Kumbam (Aquarius)
  கும்பம்: 'KUMBAM',
  கும்ப: 'KUMBAM',
  kumbam: 'KUMBAM',
  kumba: 'KUMBAM',
  aquarius: 'KUMBAM',

  // Meenam (Pisces)
  மீனம்: 'MEENAM',
  மீன: 'MEENAM',
  meenam: 'MEENAM',
  meena: 'MEENAM',
  pisces: 'MEENAM',
};

const NAKSHATRA_ALIASES: Record<string, string> = {
  // 1. Ashwini
  அஸ்வினி: 'ASHWINI',
  அசுவினி: 'ASHWINI',
  ashwini: 'ASHWINI',
  aswini: 'ASHWINI',

  // 2. Bharani
  பரணி: 'BHARANI',
  bharani: 'BHARANI',

  // 3. Karthigai
  கார்த்திகை: 'KARTHIGAI',
  கார்த்திக: 'KARTHIGAI',
  கார்திகை: 'KARTHIGAI',
  karthigai: 'KARTHIGAI',
  kartigai: 'KARTHIGAI',
  krithigai: 'KARTHIGAI',
  krithika: 'KARTHIGAI',
  kritika: 'KARTHIGAI',

  // 4. Rohini
  ரோகிணி: 'ROHINI',
  ரோஹிணி: 'ROHINI',
  rohini: 'ROHINI',

  // 5. Mrigashirsha
  மிருகசீரிஷம்: 'MRIGASHIRSHA',
  மிருகசீர்ஷம்: 'MRIGASHIRSHA',
  mrigashirsha: 'MRIGASHIRSHA',
  mrigasira: 'MRIGASHIRSHA',

  // 6. Thiruvathirai / Ardra
  திருவாதிரை: 'THIRUVATHIRAI',
  thiruvathirai: 'THIRUVATHIRAI',
  ardra: 'THIRUVATHIRAI',

  // 7. Punarpoosam / Punarvasu
  புனர்பூசம்: 'PUNARPOOSAM',
  punarpoosam: 'PUNARPOOSAM',
  punarvasu: 'PUNARPOOSAM',

  // 8. Poosam / Pushya
  பூசம்: 'POOSAM',
  பூச: 'POOSAM',
  poosam: 'POOSAM',
  pusam: 'POOSAM',
  pushya: 'POOSAM',
  pushyam: 'POOSAM',

  // 9. Ayilyam / Ashlesha
  ஆயில்யம்: 'AYILYAM',
  ஆயில்ய: 'AYILYAM',
  ayilyam: 'AYILYAM',
  ashlesha: 'AYILYAM',

  // 10. Magam
  மகம்: 'MAGAM',
  magam: 'MAGAM',
  makha: 'MAGAM',

  // 11. Pooram / Purva Phalguni
  பூரம்: 'POORAM',
  பூர: 'POORAM',
  pooram: 'POORAM',
  puram: 'POORAM',
  'purva phalguni': 'POORAM',
  poorva: 'POORAM',

  // 12. Uthiram / Uttara Phalguni
  உத்திரம்: 'UTHIRAM',
  உத்திர: 'UTHIRAM',
  uthiram: 'UTHIRAM',
  uttiram: 'UTHIRAM',
  uthram: 'UTHIRAM',
  'uttara phalguni': 'UTHIRAM',
  uthiradam: 'UTHIRADAM', // NOTE: Uthiradam is different from Uthiram!
  உத்திராடம்: 'UTHIRADAM',

  // 13. Hastham
  அஸ்தம்: 'HASTHAM',
  ஹஸ்தம்: 'HASTHAM',
  அஸ்த்தம்: 'HASTHAM',
  hastham: 'HASTHAM',
  astham: 'HASTHAM',
  hastam: 'HASTHAM',
  hasta: 'HASTHAM',

  // 14. Chithirai / Chitra
  சித்திரை: 'CHITHIRAI',
  chithirai: 'CHITHIRAI',
  chitra: 'CHITHIRAI',

  // 15. Swathi
  சுவாதி: 'SWATHI',
  சுவாதீ: 'SWATHI',
  ஸ்வாதி: 'SWATHI',
  swathi: 'SWATHI',
  swaathi: 'SWATHI',
  swati: 'SWATHI',
  chothi: 'SWATHI',

  // 16. Visakam
  விசாகம்: 'VISAKAM',
  visakam: 'VISAKAM',
  vishakha: 'VISAKAM',

  // 17. Anusham / Anuradha
  அனுஷம்: 'ANUSHAM',
  அனுசம்: 'ANUSHAM',
  அனுஷ: 'ANUSHAM',
  anusham: 'ANUSHAM',
  anusam: 'ANUSHAM',
  anuradha: 'ANUSHAM',
  anuraadha: 'ANUSHAM',

  // 18. Kettai / Jyeshtha
  கேட்டை: 'KETTAI',
  kettai: 'KETTAI',
  jyeshtha: 'KETTAI',

  // 19. Moolam / Moola
  மூலம்: 'MOOLA',
  மூல: 'MOOLA',
  moola: 'MOOLA',
  moolam: 'MOOLA',
  mula: 'MOOLA',

  // 20. Pooradam / Purva Ashadha
  பூராடம்: 'POORADAM',
  pooradam: 'POORADAM',
  'purva ashadha': 'POORADAM',

  // 21. Uthiradam / Uttara Ashadha (Already mapped above)
  'uttara ashadha': 'UTHIRADAM',

  // 22. Thiruvonam / Shravana
  திருவோணம்: 'THIRUVONAM',
  thiruvonam: 'THIRUVONAM',
  shravana: 'THIRUVONAM',
  sravana: 'THIRUVONAM',

  // 23. Avittam / Dhanishta
  அவிட்டம்: 'AVITTAM',
  avittam: 'AVITTAM',
  dhanishta: 'AVITTAM',

  // 24. Sadayam / Shatabhisha
  சதயம்: 'SADAYAM',
  sadayam: 'SADAYAM',
  shatabhisha: 'SADAYAM',

  // 25. Poorattathi / Purva Bhadrapada
  பூரட்டாதி: 'POORATTATHI',
  poorattathi: 'POORATTATHI',
  'purva bhadrapada': 'POORADAPADA',

  // 26. Uthirattathi / Uttara Bhadrapada
  உத்திரட்டாதி: 'UTHIRATTATHI',
  uthirattathi: 'UTHIRATTATHI',
  'uttara bhadrapada': 'UTHIRATTATHI',

  // 27. Revathi
  ரேவதி: 'REVATHI',
  revathi: 'REVATHI',
  revati: 'REVATHI',
};

const PLANET_ALIASES: Record<string, string> = {
  சூரியன்: 'SUN',
  சூரி: 'SUN',
  sun: 'SUN',
  suriyan: 'SUN',
  surya: 'SUN',

  சந்திரன்: 'MOON',
  சந்: 'MOON',
  moon: 'MOON',
  chandran: 'MOON',
  chandra: 'MOON',

  செவ்வாய்: 'MARS',
  செவ்: 'MARS',
  mars: 'MARS',
  sevvai: 'MARS',
  kuja: 'MARS',
  mangal: 'MARS',

  புதன்: 'MERCURY',
  புத: 'MERCURY',
  mercury: 'MERCURY',
  budhan: 'MERCURY',
  budha: 'MERCURY',

  குரு: 'JUPITER',
  jupiter: 'JUPITER',
  guru: 'JUPITER',
  brihaspati: 'JUPITER',

  சுக்கிரன்: 'VENUS',
  சுக்: 'VENUS',
  சுப்: 'VENUS',
  venus: 'VENUS',
  sukran: 'VENUS',
  shukra: 'VENUS',

  சனி: 'SATURN',
  saturn: 'SATURN',
  sani: 'SATURN',
  shani: 'SATURN',

  ராகு: 'RAHU',
  ரா: 'RAHU',
  rahu: 'RAHU',

  கேது: 'KETU',
  கே: 'KETU',
  ketu: 'KETU',

  மாந்தி: 'MANDI',
  மாந்: 'MANDI',
  mandi: 'MANDI',
  gulikan: 'MANDI',

  லக்னம்: 'LAGNA',
  இலக்கனம்: 'LAGNA',
  ல: 'LAGNA',
  லக்: 'LAGNA',
  lagna: 'LAGNA',
  ascendant: 'LAGNA',
};

export class NormalizationService {
  /**
   * Cleans input string by trimming, removing accents, punctuation, and extra whitespace.
   */
  private static cleanString(val: string): string {
    return val
      .trim()
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Normalizes Tamil or English Rasi (Zodiac Sign).
   * Returns normalized ZodiacSign or null if not recognized.
   */
  public static normalizeRasi(input: string): ZodiacSign | null {
    if (!input || typeof input !== 'string') return null;

    const trimmed = input.trim();
    // Direct match against Tamil original
    if (RASI_ALIASES[trimmed]) {
      return RASI_ALIASES[trimmed];
    }

    const cleaned = this.cleanString(input);
    if (RASI_ALIASES[cleaned]) {
      return RASI_ALIASES[cleaned];
    }

    // Check uppercase for standard keys
    const upper = trimmed.toUpperCase();
    if (ZODIAC_SIGNS_ORDER.includes(upper as ZodiacSign)) {
      return upper as ZodiacSign;
    }

    logger.debug({ input }, 'Unrecognized Rasi input');
    return null;
  }

  /**
   * Normalizes Tamil or English Nakshatra (Birth Star).
   * Note: Strips out pada information (e.g., "உத்திராடம் பாதம் 2" -> "UTHIRADAM").
   * Returns normalized Nakshatra name or null if not recognized.
   */
  public static normalizeNakshatra(input: string): string | null {
    if (!input || typeof input !== 'string') return null;

    // Remove padham / pada details (e.g. "பாதம் 1", "pada 2", "1", "2")
    const withoutPada = input
      .replace(/பாதம்\s*\d+/gi, '')
      .replace(/pada\s*\d+/gi, '')
      .replace(/padam\s*\d+/gi, '')
      .trim();

    if (NAKSHATRA_ALIASES[withoutPada]) {
      return NAKSHATRA_ALIASES[withoutPada];
    }

    const cleaned = this.cleanString(withoutPada);
    if (NAKSHATRA_ALIASES[cleaned]) {
      return NAKSHATRA_ALIASES[cleaned];
    }

    // Try first word only if multi-word like "Moola Nakshatram"
    const firstWord = cleaned.split(' ')[0];
    if (firstWord && NAKSHATRA_ALIASES[firstWord]) {
      return NAKSHATRA_ALIASES[firstWord];
    }

    logger.debug({ input }, 'Unrecognized Nakshatra input');
    return null;
  }

  /**
   * Normalizes a planet name.
   */
  public static normalizePlanet(input: string): string | null {
    if (!input || typeof input !== 'string') return null;

    const trimmed = input.trim();
    if (PLANET_ALIASES[trimmed]) {
      return PLANET_ALIASES[trimmed];
    }

    const cleaned = this.cleanString(trimmed);
    if (PLANET_ALIASES[cleaned]) {
      return PLANET_ALIASES[cleaned];
    }

    return null;
  }

  /**
   * Calculates the House Number (1-12) of a planet sign relative to Lagna sign.
   * Lagna sign is House 1.
   * Returns null if either sign is invalid.
   */
  public static calculateHouseFromLagna(
    lagnaSign: ZodiacSign,
    planetSign: ZodiacSign
  ): number | null {
    const lagnaIndex = ZODIAC_SIGNS_ORDER.indexOf(lagnaSign);
    const planetIndex = ZODIAC_SIGNS_ORDER.indexOf(planetSign);

    if (lagnaIndex === -1 || planetIndex === -1) {
      return null;
    }

    return ((planetIndex - lagnaIndex + 12) % 12) + 1;
  }
}
