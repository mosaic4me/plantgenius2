import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { logger } from './logger';
import { PlantIdError } from '@/types/errors';

const MAX_IMAGE_WIDTH = 1024;
const MAX_IMAGE_HEIGHT = 1024;
const COMPRESSION_QUALITY = 0.7;
const MAX_FILE_SIZE_MB = 5;

interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  size?: number;
}

/**
 * Compresses and optimizes an image for upload
 */
export async function compressImage(imageUri: string): Promise<CompressedImage> {
  try {
    logger.debug('Starting image compression', { imageUri });

    // Get original file info
    const fileInfo = await FileSystem.getInfoAsync(imageUri);

    if (!fileInfo.exists) {
      throw new PlantIdError('Image file does not exist', 'FILE_NOT_FOUND');
    }

    // Check file size
    const fileSizeMB = (fileInfo.size || 0) / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      throw new PlantIdError(
        `Image file too large (${fileSizeMB.toFixed(1)}MB). Maximum size is ${MAX_FILE_SIZE_MB}MB`,
        'FILE_TOO_LARGE'
      );
    }

    // Compress and resize image
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: MAX_IMAGE_WIDTH,
            height: MAX_IMAGE_HEIGHT,
          },
        },
      ],
      {
        compress: COMPRESSION_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Get compressed file size
    const compressedInfo = await FileSystem.getInfoAsync(manipulatedImage.uri);
    const compressedSize = compressedInfo.size || 0;
    const originalSize = fileInfo.size || 0;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    logger.info('Image compression complete', {
      originalSize,
      compressedSize,
      compressionRatio: `${compressionRatio}%`,
      width: manipulatedImage.width,
      height: manipulatedImage.height,
    });

    return {
      uri: manipulatedImage.uri,
      width: manipulatedImage.width,
      height: manipulatedImage.height,
      size: compressedSize,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Error compressing image', err, { imageUri });
    throw error;
  }
}

/**
 * Generates a thumbnail from an image
 */
export async function generateThumbnail(
  imageUri: string,
  size: number = 200
): Promise<string> {
  try {
    const thumbnail = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: size,
            height: size,
          },
        },
      ],
      {
        compress: 0.6,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return thumbnail.uri;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Error generating thumbnail', err, { imageUri, size });
    throw error;
  }
}
