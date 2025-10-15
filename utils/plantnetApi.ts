/**
 * Pl@ntNet API Integration
 *
 * Replaces Plant.id API with Pl@ntNet for plant identification
 * API Documentation: https://my.plantnet.org/usage
 */

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import type { PlantIdentification } from '@/types/plant';
import { logger } from './logger';
import { NetworkError, PlantIdError } from '@/types/errors';
import { validateImageUri } from './validation';
import { compressImage } from './imageProcessor';
import { config } from './config';

// SECURITY: Removed hardcoded API key - now using config
const API_KEY = config.plantnetApiKey;
const API_URL = config.plantnetApiUrl;

/**
 * Pl@ntNet API Response Types
 */
interface PlantNetResult {
  score: number;
  species: {
    scientificNameWithoutAuthor: string;
    scientificNameAuthorship: string;
    genus: {
      scientificNameWithoutAuthor: string;
      scientificNameAuthorship: string;
    };
    family: {
      scientificNameWithoutAuthor: string;
      scientificNameAuthorship: string;
    };
    commonNames: string[];
  };
  images: Array<{
    organ: string;
    author: string;
    license: string;
    date: {
      timestamp: number;
      string: string;
    };
    citation: string;
    url: {
      o: string;
      m: string;
      s: string;
    };
  }>;
  gbif?: {
    id: string;
  };
}

interface PlantNetResponse {
  query: {
    project: string;
    images: string[];
    organs: string[];
    includeRelatedImages: boolean;
  };
  language: string;
  preferedReferential: string;
  switchToProject: string | null;
  bestMatch: string;
  results: PlantNetResult[];
  version: string;
  remainingIdentificationRequests: number;
}

/**
 * Convert image to format suitable for Pl@ntNet API
 */
async function prepareImageForUpload(imageUri: string): Promise<{ uri: string; type: string; name: string }> {
  try {
    validateImageUri(imageUri);

    // Compress image before upload
    logger.debug('Compressing image for Pl@ntNet', { imageUri });
    const compressed = await compressImage(imageUri);

    let fileUri = compressed.uri;

    // Ensure proper file:// prefix for mobile platforms
    if (Platform.OS !== 'web') {
      if (!fileUri.startsWith('file://')) {
        fileUri = `file://${fileUri}`;
      }

      // Verify file exists
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new PlantIdError('Image file does not exist', 'FILE_NOT_FOUND');
      }
    }

    return {
      uri: fileUri,
      type: 'image/jpeg',
      name: `plant_${Date.now()}.jpg`,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Error preparing image for upload', err, { imageUri });
    throw new PlantIdError('Failed to process image for upload', 'IMAGE_PROCESSING_FAILED');
  }
}

/**
 * Upload image and identify plant using Pl@ntNet API
 */
export async function identifyPlant(imageUri: string): Promise<PlantIdentification> {
  try {
    logger.info('Starting plant identification with Pl@ntNet', { imageUri });

    // Prepare image for upload
    const imageData = await prepareImageForUpload(imageUri);

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('images', {
      uri: imageData.uri,
      type: imageData.type,
      name: imageData.name,
    } as any);

    // Optional: Specify organs if known (leaf, flower, fruit, bark)
    formData.append('organs', 'auto');

    // Include related images for better context
    formData.append('include-related-images', 'true');

    // Make API request
    logger.debug('Sending request to Pl@ntNet API');
    const apiResponse = await fetch(`${API_URL}?api-key=${API_KEY}`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    logger.debug('Pl@ntNet API response received', { status: apiResponse.status });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      logger.error('Pl@ntNet API error', new Error(errorText), { status: apiResponse.status });

      if (apiResponse.status === 404) {
        throw new PlantIdError('No plant identified in the image', 'NO_PLANT_FOUND');
      }

      if (apiResponse.status === 429) {
        throw new PlantIdError('Rate limit exceeded. Please try again later.', 'RATE_LIMIT_EXCEEDED');
      }

      throw new PlantIdError(
        `Pl@ntNet API request failed: ${apiResponse.status}`,
        'API_REQUEST_FAILED',
        apiResponse.status
      );
    }

    const data: PlantNetResponse = await apiResponse.json();
    logger.debug('Pl@ntNet response parsed', {
      resultsCount: data.results?.length,
      remainingRequests: data.remainingIdentificationRequests,
    });

    if (!data.results || data.results.length === 0) {
      throw new PlantIdError('No plant identified in the image', 'NO_PLANT_FOUND');
    }

    // Get the best match
    const topResult = data.results[0];

    // Parse plant data into our format
    const plantData: PlantIdentification = {
      id: `plant_${Date.now()}`,
      timestamp: Date.now(),
      imageUri,
      commonName: topResult.species.commonNames?.[0] || topResult.species.scientificNameWithoutAuthor,
      scientificName: topResult.species.scientificNameWithoutAuthor,
      confidence: Math.round(topResult.score * 100),
      family: topResult.species.family.scientificNameWithoutAuthor,
      genus: topResult.species.genus.scientificNameWithoutAuthor,
      species: topResult.species.scientificNameWithoutAuthor.split(' ').slice(1).join(' '),
      description: generatePlantDescription(topResult),
      careLevel: determineCareLevel(topResult),
      sunExposure: 'Bright indirect light',
      wateringSchedule: 'Water when soil is dry',
      soilType: 'Well-draining potting mix',
      toxicity: {
        dogs: false,
        cats: false,
        horses: false,
      },
      edible: false,
      medicinal: false,
      nativeHabitat: 'Various regions',
      bloomingSeason: ['Spring', 'Summer'],
      pollinators: ['Bees', 'Butterflies'],
      similarSpecies: data.results.slice(1, 4).map((result) => ({
        name: result.species.scientificNameWithoutAuthor,
        imageUrl: result.images[0]?.url?.s || '',
        difference: `Confidence: ${Math.round(result.score * 100)}%`,
      })),
      saved: false,
    };

    logger.info('Plant identification successful', {
      commonName: plantData.commonName,
      confidence: plantData.confidence,
      remainingRequests: data.remainingIdentificationRequests,
    });

    return plantData;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Error identifying plant with Pl@ntNet', err);

    if (err.message.includes('Network request failed') || err.message.includes('Failed to fetch')) {
      throw new NetworkError();
    }

    if (error instanceof PlantIdError) {
      throw error;
    }

    throw new PlantIdError('Failed to identify plant. Please try again.', 'IDENTIFICATION_FAILED');
  }
}

/**
 * Generate plant description from Pl@ntNet data
 */
function generatePlantDescription(result: PlantNetResult): string {
  const scientificName = result.species.scientificNameWithoutAuthor;
  const commonNames = result.species.commonNames || [];
  const family = result.species.family.scientificNameWithoutAuthor;

  let description = `${scientificName}`;

  if (commonNames.length > 0) {
    description += `, commonly known as ${commonNames.join(', ')},`;
  }

  description += ` is a member of the ${family} family.`;

  return description;
}

/**
 * Determine care level based on available information
 */
function determineCareLevel(result: PlantNetResult): 'Beginner' | 'Intermediate' | 'Expert' {
  // Default to Intermediate since Pl@ntNet doesn't provide care information
  // In production, you could cross-reference with a plant care database
  return 'Intermediate';
}

/**
 * Get additional plant information from GBIF if available
 */
export async function getPlantDetailsFromGBIF(gbifId: string): Promise<any> {
  try {
    const response = await fetch(`https://api.gbif.org/v1/species/${gbifId}`);

    if (!response.ok) {
      throw new Error(`GBIF API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Error fetching GBIF data', error as Error, { gbifId });
    return null;
  }
}

/**
 * Search plants by name using Pl@ntNet
 */
export async function searchPlantByName(query: string, limit: number = 10): Promise<any[]> {
  try {
    // Pl@ntNet doesn't have a dedicated search endpoint
    // You would need to use GBIF or another database for text search
    const response = await fetch(
      `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    logger.error('Error searching plant by name', error as Error, { query });
    return [];
  }
}

/**
 * Get plant care information (placeholder for integration with care database)
 */
export async function getPlantCareInfo(scientificName: string): Promise<any> {
  try {
    // TODO: Integrate with a plant care database like Trefle API or similar
    // For now, return default care information
    logger.info('Plant care info requested', { scientificName });

    return {
      watering: 'Water when soil is dry',
      sunlight: 'Bright indirect light',
      soil: 'Well-draining potting mix',
      temperature: '18-24°C (65-75°F)',
      humidity: 'Moderate (40-60%)',
      fertilizing: 'Monthly during growing season',
      pruning: 'Prune dead or damaged leaves as needed',
      propagation: 'Stem cuttings or division',
    };
  } catch (error) {
    logger.error('Error fetching plant care info', error as Error, { scientificName });
    return null;
  }
}
