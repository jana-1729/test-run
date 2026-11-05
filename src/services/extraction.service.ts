import { JathagamExtraction } from '../schemas/jathagam.schema.js';
import { ExtractionError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { GeminiService, IGeminiService } from './gemini.service.js';
import { ImageService } from './image.service.js';
import { NormalizationService, ZodiacSign } from './normalization.service.js';

export class ExtractionService {
  private geminiService: IGeminiService;

  constructor(geminiService?: IGeminiService) {
    this.geminiService = geminiService || new GeminiService();
  }

  /**
   * Processes an image buffer: validates, extracts via Gemini, normalizes values,
   * cross-verifies chart calculations, and returns structured Jathagam data.
   */
  public async processHoroscopeImage(
    imageBuffer: Buffer,
    originalMimeType = 'image/jpeg'
  ): Promise<{ data: JathagamExtraction; rawGeminiResponse: string }> {
    // 1. Preprocess & optimize image
    const preprocessed = await ImageService.preprocessImage(imageBuffer, originalMimeType);

    // 2. Call Gemini
    const { data, rawText } = await this.geminiService.extractHoroscope(
      preprocessed.buffer,
      preprocessed.mimeType
    );

    // 3. Document type check
    if (!data.isHoroscopeDocument || data.documentType === 'NOT_HOROSCOPE') {
      logger.info({ documentType: data.documentType }, 'Uploaded image is not a horoscope document');
      throw new ValidationError('The uploaded image does not appear to be a valid horoscope document');
    }

    // 4. Deterministic normalization of extracted fields
    // Nakshatra
    const rawStar = data.janmaNakshatra.rawText || data.janmaNakshatra.normalizedValue;
    const normalizedStar = NormalizationService.normalizeNakshatra(rawStar);
    if (normalizedStar) {
      data.janmaNakshatra.normalizedValue = normalizedStar;
    } else if (data.janmaNakshatra.status === 'READABLE') {
      data.janmaNakshatra.status = 'AMBIGUOUS';
    }

    // Janma Rasi
    const rawRasi = data.janmaRasi.rawText || data.janmaRasi.normalizedValue;
    const normalizedRasi = NormalizationService.normalizeRasi(rawRasi);
    if (normalizedRasi) {
      data.janmaRasi.normalizedValue = normalizedRasi;
    } else if (data.janmaRasi.status === 'READABLE') {
      data.janmaRasi.status = 'AMBIGUOUS';
    }

    // Lagna
    const rawLagna = data.lagna.rawText || data.lagna.normalizedValue;
    const normalizedLagna = NormalizationService.normalizeRasi(rawLagna);
    if (normalizedLagna) {
      data.lagna.normalizedValue = normalizedLagna;
    } else if (data.lagna.status === 'READABLE') {
      data.lagna.status = 'AMBIGUOUS';
    }

    // Mars Position
    const rawMarsSign = data.marsPosition.rasiSign || data.marsPosition.tamilRasiSign;
    if (rawMarsSign) {
      const normalizedMarsSign = NormalizationService.normalizeRasi(rawMarsSign);
      if (normalizedMarsSign) {
        data.marsPosition.rasiSign = normalizedMarsSign;
      }
    }

    // 5. Cross-verify Mars House calculation
    if (normalizedLagna && data.marsPosition.rasiSign) {
      const calculatedHouse = NormalizationService.calculateHouseFromLagna(
        normalizedLagna as ZodiacSign,
        data.marsPosition.rasiSign as ZodiacSign
      );

      if (calculatedHouse !== null) {
        if (data.marsHouse.value === null) {
          data.marsHouse.value = calculatedHouse;
          data.marsHouse.calculationBasis = `Calculated: Lagna=${normalizedLagna}, Mars=${data.marsPosition.rasiSign} => House ${calculatedHouse}`;
        }
      }
    }

    return { data, rawGeminiResponse: rawText };
  }
}
