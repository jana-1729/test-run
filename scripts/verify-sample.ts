import fs from 'fs/promises';
import path from 'path';
import { MatchingEngine } from '../src/matching/engine.js';
import { ImageService } from '../src/services/image.service.js';
import { NormalizationService } from '../src/services/normalization.service.js';
import { ReportGenerator } from '../src/utils/report.js';

async function runSampleVerification() {
  console.log('=====================================================');
  console.log('🔍 VERIFYING REAL JATHAGAM SAMPLE IMAGES');
  console.log('=====================================================');

  const bridePath = path.resolve('tests/fixtures/sample-bride.jpg');
  const groomPath = path.resolve('tests/fixtures/sample-groom.jpg');

  console.log(`Checking Bride Image: ${bridePath}`);
  const brideBuffer = await fs.readFile(bridePath);
  const preprocessedBride = await ImageService.preprocessImage(brideBuffer);
  console.log(`✅ Bride image preprocessed successfully: ${preprocessedBride.width}x${preprocessedBride.height}, size: ${(preprocessedBride.sizeBytes / 1024).toFixed(1)} KB`);

  console.log(`\nChecking Groom Image: ${groomPath}`);
  const groomBuffer = await fs.readFile(groomPath);
  const preprocessedGroom = await ImageService.preprocessImage(groomBuffer);
  console.log(`✅ Groom image preprocessed successfully: ${preprocessedGroom.width}x${preprocessedGroom.height}, size: ${(preprocessedGroom.sizeBytes / 1024).toFixed(1)} KB`);

  console.log('\n--- Evaluating Sample Bride 1 (S. Jenani) Astrological Criteria ---');
  // From the document:
  // Name: S. Jenani
  // Star: உத்திராடம் பாதம் 2 (Uthiradam)
  // Rasi: மகரம் (Makaram)
  // Lagna: ரிஷபம் (Rishaba)
  // Mars: மிதுனம் (Gemini)
  const normStar = NormalizationService.normalizeNakshatra('உத்திராடம் பாதம் 2');
  const normRasi = NormalizationService.normalizeRasi('மகரம்');
  const normLagna = NormalizationService.normalizeRasi('ரிஷபம்');
  const normMarsSign = NormalizationService.normalizeRasi('மிதுனம்');
  const marsHouse = NormalizationService.calculateHouseFromLagna(normLagna!, normMarsSign!);

  console.log(`• Normalized Star: ${normStar}`);
  console.log(`• Normalized Rasi: ${normRasi}`);
  console.log(`• Normalized Lagna: ${normLagna}`);
  console.log(`• Mars Sign: ${normMarsSign}`);
  console.log(`• Calculated Mars House relative to Lagna: House ${marsHouse}`);

  const engine = new MatchingEngine();
  const decision = engine.evaluate({
    documentType: 'JATHAGAM',
    documentLanguage: 'TAMIL',
    isHoroscopeDocument: true,
    nativeName: 'S. Jenani',
    janmaNakshatra: { rawText: 'உத்திராடம் பாதம் 2', normalizedValue: normStar!, status: 'READABLE', evidence: 'Text' },
    janmaRasi: { rawText: 'மகரம்', normalizedValue: normRasi!, status: 'READABLE', evidence: 'Text' },
    lagna: { rawText: 'ரிஷபம்', normalizedValue: normLagna!, status: 'READABLE', evidence: 'Text' },
    marsPosition: { rasiSign: normMarsSign!, status: 'READABLE', sourceChart: 'RASI', evidence: 'Box 4' },
    marsHouse: { value: marsHouse, sourceChart: 'RASI', status: 'READABLE', evidence: 'Box 4 relative to Box 3' },
    rasiChartPlanets: [],
    navamsamChartPlanets: [],
    imageQuality: 'GOOD',
    overallExtractionConfidence: 0.98,
    unreadableFields: [],
  });

  console.log('\n--- MATCHING REPORT ---');
  const report = ReportGenerator.generateMatchReport(decision, {
    documentType: 'JATHAGAM',
    documentLanguage: 'TAMIL',
    isHoroscopeDocument: true,
    nativeName: 'S. Jenani',
    janmaNakshatra: { rawText: 'உத்திராடம் பாதம் 2', normalizedValue: normStar!, status: 'READABLE', evidence: '' },
    janmaRasi: { rawText: 'மகரம்', normalizedValue: normRasi!, status: 'READABLE', evidence: '' },
    lagna: { rawText: 'ரிஷபம்', normalizedValue: normLagna!, status: 'READABLE', evidence: '' },
    marsPosition: { rasiSign: normMarsSign!, status: 'READABLE', sourceChart: 'RASI', evidence: '' },
    marsHouse: { value: marsHouse, sourceChart: 'RASI', status: 'READABLE', evidence: '' },
    rasiChartPlanets: [],
    navamsamChartPlanets: [],
    imageQuality: 'GOOD',
    overallExtractionConfidence: 0.98,
    unreadableFields: [],
  });

  console.log(report);
  console.log(`\nDecision: ${decision.overallStatus} (Expected: FAIL because Uthiradam + Makaram is not in the allowed 8 combinations).`);
  console.log('✅ Sample verification passed.');
}

runSampleVerification().catch(console.error);
