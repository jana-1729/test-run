import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface ProcessedImageResult {
  buffer: Buffer;
  mimeType: string;
  width?: number;
  height?: number;
  sizeBytes: number;
}

export class ImageService {
  /**
   * Allowed MIME types for horoscope documents
   */
  public static readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
  ];

  /**
   * Validates and prepares image buffer for Gemini multimodal processing.
   * If image is oversized or misoriented, optimizes and auto-rotates using sharp.
   */
  public static async preprocessImage(
    inputBuffer: Buffer,
    originalMimeType = 'image/jpeg'
  ): Promise<ProcessedImageResult> {
    const maxSizeBytes = env.MAX_IMAGE_SIZE_MB * 1024 * 1024;

    if (inputBuffer.length > maxSizeBytes) {
      throw new ValidationError(
        `Image size (${(inputBuffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit (${env.MAX_IMAGE_SIZE_MB} MB)`
      );
    }

    try {
      const image = sharp(inputBuffer);
      const metadata = await image.metadata();

      if (!metadata.format) {
        throw new ValidationError('Could not identify image format');
      }

      // Check dimensions
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      if (width < 200 || height < 200) {
        throw new ValidationError('Image resolution is too low for horoscope reading');
      }

      // Auto-orient and normalize to high-quality JPEG
      let pipeline = image.rotate(); // auto-rotate based on EXIF orientation

      // If dimensions are extremely large (> 3000px), downscale slightly to save bandwidth while retaining OCR clarity
      if (width > 3000 || height > 3000) {
        pipeline = pipeline.resize({
          width: 2500,
          height: 2500,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Sharpen slightly to enhance Tamil text OCR contrast
      pipeline = pipeline.sharpen().jpeg({ quality: 90 });

      const processedBuffer = await pipeline.toBuffer();

      logger.debug(
        {
          originalSize: inputBuffer.length,
          processedSize: processedBuffer.length,
          width,
          height,
        },
        'Image preprocessing completed successfully'
      );

      return {
        buffer: processedBuffer,
        mimeType: 'image/jpeg',
        width,
        height,
        sizeBytes: processedBuffer.length,
      };
    } catch (err: unknown) {
      if (err instanceof ValidationError) throw err;
      logger.error({ err }, 'Failed to preprocess image with Sharp');
      throw new ValidationError(
        `Image preprocessing failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Safely deletes temporary file from disk
   */
  public static async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      logger.debug({ filePath }, 'Temporary file cleaned up');
    } catch (err) {
      // Ignore if file doesn't exist
      logger.debug({ filePath, err }, 'Temporary file already deleted or not found');
    }
  }

  /**
   * Saves buffer temporarily to disk if needed
   */
  public static async saveTempFile(buffer: Buffer, prefix = 'jathagam_'): Promise<string> {
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`);
    await fs.writeFile(tempFile, buffer);
    return tempFile;
  }
}
