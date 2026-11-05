import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { JathagamExtraction, JathagamExtractionSchema } from '../schemas/jathagam.schema.js';
import { ExtractionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface IGeminiService {
  extractHoroscope(
    imageBuffer: Buffer,
    mimeType?: string
  ): Promise<{ data: JathagamExtraction; rawText: string }>;
}

const EXTRACTION_SYSTEM_PROMPT = `
You are an expert Vedic astrologer and multilingual Tamil/English OCR specialist.
Your ONLY role is to faithfully and accurately EXTRACT horoscope and astrological chart information from the provided document image.
DO NOT evaluate marriage compatibility. DO NOT make matching decisions. ONLY extract facts and visible information.

### SOUTH INDIAN HOROSCOPE CHART FORMAT (Fixed Zodiac Layout - 12 boxes):
In South India (Tamil Nadu), the traditional Rasi chart is a square grid of 12 boxes arranged clockwise:
- Row 1, Col 1 (Top-Left corner): Pisces (மீனம் / Meenam)
- Row 1, Col 2 (Top Middle-Left): Aries (மேஷம் / Mesham)
- Row 1, Col 3 (Top Middle-Right): Taurus (ரிஷபம் / Rishabam)
- Row 1, Col 4 (Top-Right corner): Gemini (மிதுனம் / Midhunam)
- Row 2, Col 4 (Right Upper-Middle): Cancer (கடகம் / Kadagam)
- Row 3, Col 4 (Right Lower-Middle): Leo (சிம்மம் / Simmam)
- Row 4, Col 4 (Bottom-Right corner): Virgo (கன்னி / Kanni)
- Row 4, Col 3 (Bottom Middle-Right): Libra (துலாம் / Thula)
- Row 4, Col 2 (Bottom Middle-Left): Scorpio (விருச்சிகம் / Viruchagam)
- Row 4, Col 1 (Bottom-Left corner): Sagittarius (தனுசு / Dhanusu)
- Row 3, Col 1 (Left Lower-Middle): Capricorn (மகரம் / Makaram)
- Row 2, Col 1 (Left Upper-Middle): Aquarius (கும்பம் / Kumbam)

### TAMIL ABBREVIATIONS IN CHART BOXES:
- "ல" or "லக்" = Lagna / Ascendant (House 1)
- "செவ்" or "செவ்வாய்" = Mars (Sevvai / Angaragan)
- "சந்" or "சந்திரன்" = Moon (identifies birth Rasi)
- "சூரி" or "சூரியன்" = Sun
- "புத" or "புதன்" = Mercury
- "குரு" = Jupiter
- "சுக்" or "சுப்" = Venus
- "சனி" = Saturn
- "ரா" or "ராகு" = Rahu
- "கே" or "கேது" = Ketu
- "மாந்" = Mandi

### CRITICAL RULES:
1. Identify the Janma Nakshatra (நட்சத்திரம்) and Janma Rasi (ராசி / இராசி) from printed/handwritten text labels AND/OR chart positions.
2. Determine Mars House:
   - Identify which sign box contains "ல" or "லக்" (Lagna = 1st House).
   - Identify which sign box contains "செவ்" (Mars).
   - Counting clockwise from Lagna box as 1, determine the exact house number of Mars (1 to 12).
   - Do NOT confuse Mars sign (Rasi) with Mars house number.
   - Use the main "இராசி" (Rasi) chart as authoritative. Do NOT confuse with "நவாம்சம்" (Navamsam) chart.
3. If an image is not a horoscope or bio-data, set isHoroscopeDocument: false and documentType: "NOT_HOROSCOPE".
4. If a field is blurred, cut off, or unclear, set status: "UNREADABLE" or "AMBIGUOUS". NEVER guess or hallucinate.
5. Provide evidence strings quoting the exact text or chart box where the field was found.

Return STRICT JSON complying with this schema:
{
  "documentType": "JATHAGAM" | "HOROSCOPE_CHART" | "MARRIAGE_BIO_DATA" | "NOT_HOROSCOPE" | "UNKNOWN",
  "documentLanguage": "TAMIL" | "ENGLISH" | "BILINGUAL" | "UNKNOWN",
  "isHoroscopeDocument": true | false,
  "nativeName": string,
  "dateOfBirth": string,
  "timeOfBirth": string,
  "placeOfBirth": string,
  "janmaNakshatra": {
    "rawText": string,
    "normalizedValue": string,
    "status": "READABLE" | "AMBIGUOUS" | "UNREADABLE" | "MISSING",
    "evidence": string
  },
  "janmaRasi": {
    "rawText": string,
    "normalizedValue": string,
    "status": "READABLE" | "AMBIGUOUS" | "UNREADABLE" | "MISSING",
    "evidence": string
  },
  "lagna": {
    "rawText": string,
    "normalizedValue": string,
    "status": "READABLE" | "AMBIGUOUS" | "UNREADABLE" | "MISSING",
    "evidence": string
  },
  "marsPosition": {
    "rasiSign": string,
    "tamilRasiSign": string,
    "status": "READABLE" | "AMBIGUOUS" | "UNREADABLE" | "MISSING",
    "sourceChart": "RASI" | "NAVAMSAM",
    "evidence": string
  },
  "marsHouse": {
    "value": number (1 to 12) or null,
    "sourceChart": "RASI" | "NAVAMSAM",
    "status": "READABLE" | "AMBIGUOUS" | "UNREADABLE" | "MISSING",
    "evidence": string,
    "calculationBasis": string
  },
  "rasiChartPlanets": [
    {
      "planet": string,
      "tamilName": string,
      "rasiSign": string,
      "houseFromLagna": number
    }
  ],
  "imageQuality": "EXCELLENT" | "GOOD" | "FAIR" | "POOR",
  "overallExtractionConfidence": number (0.0 to 1.0),
  "unreadableFields": string[]
}
`;

export class GeminiService implements IGeminiService {
  private ai: GoogleGenAI;
  private modelName: string;

  constructor(apiKey = env.GEMINI_API_KEY, modelName = env.GEMINI_MODEL) {
    this.ai = new GoogleGenAI({ apiKey });
    this.modelName = modelName;
  }

  /**
   * Calls Gemini multimodal model to extract horoscope data from an image buffer.
   */
  public async extractHoroscope(
    imageBuffer: Buffer,
    mimeType = 'image/jpeg'
  ): Promise<{ data: JathagamExtraction; rawText: string }> {
    const base64Data = imageBuffer.toString('base64');

    const candidateModels = Array.from(
      new Set([this.modelName, 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-flash-lite-latest'])
    );

    let lastError: unknown;

    for (const currentModel of candidateModels) {
      let attempts = 0;
      const maxAttemptsPerModel = 2;

      while (attempts < maxAttemptsPerModel) {
        attempts++;
        try {
          logger.debug(
            { model: currentModel, attempt: attempts },
            'Sending image to Gemini for multimodal extraction'
          );

          const response = await this.ai.models.generateContent({
            model: currentModel,
            contents: [
              {
                role: 'user',
                parts: [
                  { text: EXTRACTION_SYSTEM_PROMPT },
                  {
                    inlineData: {
                      mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.1, // low temperature for deterministic fact extraction
            },
          });

          const rawText = response.text || '';
          if (!rawText.trim()) {
            throw new ExtractionError('Gemini returned an empty response');
          }

          let parsedJson: unknown;
          try {
            // Remove potential markdown code blocks if returned
            const cleanedText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            parsedJson = JSON.parse(cleanedText);
          } catch (jsonErr) {
            logger.error({ rawText, jsonErr }, 'Failed to parse Gemini response as JSON');
            throw new ExtractionError(
              `Invalid JSON returned by Gemini: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)}`
            );
          }

          // Validate structure with Zod
          const validationResult = JathagamExtractionSchema.safeParse(parsedJson);
          if (!validationResult.success) {
            logger.warn(
              { issues: validationResult.error.issues, parsedJson },
              'Zod validation failed on Gemini output'
            );
            throw new ExtractionError(
              `Extracted data schema validation failed: ${validationResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
            );
          }

          const data = validationResult.data;
          data.geminiModel = currentModel;
          data.extractedAt = new Date().toISOString();

          return { data, rawText };
        } catch (err: unknown) {
          lastError = err;
          const errMsg = err instanceof Error ? err.message : String(err);
          logger.warn(
            { model: currentModel, attempt: attempts, err: errMsg },
            'Gemini extraction attempt failed'
          );

          // If 404 or persistent 503, break and try next candidate model
          if (errMsg.includes('404') || errMsg.includes('no longer available')) {
            break;
          }

          if (attempts < maxAttemptsPerModel) {
            await new Promise((res) => setTimeout(res, 1000));
          }
        }
      }
    }

    throw new ExtractionError(
      `Gemini extraction failed across all models: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
  }
}
