import { z } from 'zod';

export const FieldReadStatusSchema = z.enum(['READABLE', 'AMBIGUOUS', 'UNREADABLE', 'MISSING']);
export type FieldReadStatus = z.infer<typeof FieldReadStatusSchema>;

export const ChartTypeSchema = z.enum(['RASI', 'NAVAMSAM']);
export type ChartType = z.infer<typeof ChartTypeSchema>;

export const DocumentLanguageSchema = z.enum(['TAMIL', 'ENGLISH', 'BILINGUAL', 'UNKNOWN']);
export type DocumentLanguage = z.infer<typeof DocumentLanguageSchema>;

export const DocumentTypeSchema = z.enum([
  'JATHAGAM',
  'HOROSCOPE_CHART',
  'MARRIAGE_BIO_DATA',
  'NOT_HOROSCOPE',
  'UNKNOWN',
]);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export const ImageQualitySchema = z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']);
export type ImageQuality = z.infer<typeof ImageQualitySchema>;

export const ExtractedFieldSchema = z.object({
  rawText: z.string().default(''),
  normalizedValue: z.string().default(''),
  status: FieldReadStatusSchema.default('READABLE'),
  evidence: z.string().default(''),
});
export type ExtractedField = z.infer<typeof ExtractedFieldSchema>;

export const MarsHouseSchema = z.object({
  value: z.number().int().min(1).max(12).nullable(),
  sourceChart: ChartTypeSchema.default('RASI'),
  status: FieldReadStatusSchema.default('READABLE'),
  evidence: z.string().default(''),
  calculationBasis: z.string().optional(),
});
export type MarsHouse = z.infer<typeof MarsHouseSchema>;

export const PlanetPositionSchema = z.object({
  planet: z.string(),
  tamilName: z.string().optional(),
  rasiSign: z.string().optional(),
  tamilRasiSign: z.string().optional(),
  houseFromLagna: z.number().int().min(1).max(12).optional(),
});
export type PlanetPosition = z.infer<typeof PlanetPositionSchema>;

export const JathagamExtractionSchema = z.object({
  documentType: DocumentTypeSchema.default('JATHAGAM'),
  documentLanguage: DocumentLanguageSchema.default('TAMIL'),
  isHoroscopeDocument: z.boolean().default(true),

  nativeName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  timeOfBirth: z.string().optional(),
  placeOfBirth: z.string().optional(),

  janmaNakshatra: ExtractedFieldSchema,
  janmaRasi: ExtractedFieldSchema,
  lagna: ExtractedFieldSchema,

  marsPosition: z.object({
    rasiSign: z.string().default(''),
    tamilRasiSign: z.string().optional(),
    status: FieldReadStatusSchema.default('READABLE'),
    sourceChart: ChartTypeSchema.default('RASI'),
    evidence: z.string().default(''),
  }),

  marsHouse: MarsHouseSchema,

  rasiChartPlanets: z.array(PlanetPositionSchema).default([]),
  navamsamChartPlanets: z.array(PlanetPositionSchema).default([]),

  imageQuality: ImageQualitySchema.default('GOOD'),
  overallExtractionConfidence: z.number().min(0).max(1).default(0.85),
  unreadableFields: z.array(z.string()).default([]),
  geminiModel: z.string().optional(),
  extractedAt: z.string().optional(),
  rawGeminiNotes: z.string().optional(),
});

export type JathagamExtraction = z.infer<typeof JathagamExtractionSchema>;
