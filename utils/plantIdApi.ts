import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import type { PlantIdentification, PlantIdApiResponse } from '@/types/plant';
import { config } from './config';

const API_KEY = config.plantIdApiKey;
const API_URL = config.plantIdApiUrl;

import { logger } from './logger';
import { NetworkError, PlantIdError } from '@/types/errors';
import { validateImageUri } from './validation';
import { compressImage } from './imageProcessor';

async function convertImageToBase64(imageUri: string): Promise<string> {
    try {
        validateImageUri(imageUri);

        // Compress image before conversion
        logger.debug('Compressing image before conversion', { imageUri });
        const compressed = await compressImage(imageUri);

        logger.debug('Converting compressed image to base64', { uri: compressed.uri });

        if (Platform.OS === 'web') {
            const response = await fetch(compressed.uri);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } else {
            let fileUri = compressed.uri;

            if (imageUri.startsWith('file://')) {
                fileUri = imageUri;
            } else if (!imageUri.startsWith('/')) {
                fileUri = `file://${imageUri}`;
            }

            logger.debug('Reading file from path', { fileUri });

            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            logger.debug('File info retrieved', { exists: fileInfo.exists, size: fileInfo.size });

            if (!fileInfo.exists) {
                throw new PlantIdError('Image file does not exist', 'FILE_NOT_FOUND');
            }

            const base64 = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            logger.debug('Base64 conversion successful', { length: base64.length });
            return `data:image/jpeg;base64,${base64}`;
        }
    } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        logger.error('Error converting image to base64', err, { imageUri });

        throw new PlantIdError('Failed to process image. Please try again.', 'IMAGE_PROCESSING_FAILED');
    }
}

export async function identifyPlant(imageUri: string): Promise<PlantIdentification> {
    try {
        logger.info('Starting plant identification', { imageUri });

        const base64Image = await convertImageToBase64(imageUri);
        logger.debug('Image converted to base64', { length: base64Image.length });

        const requestBody = {
            images: [base64Image],
            similar_images: true,
        };

        logger.debug('Sending request to Plant.id API');
        const apiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Api-Key': API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        logger.debug('API Response received', { status: apiResponse.status });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            logger.error('API Error', new Error(errorText), { status: apiResponse.status });
            throw new PlantIdError(
                `API request failed: ${apiResponse.status}`,
                'API_REQUEST_FAILED',
                apiResponse.status
            );
        }

        const data: PlantIdApiResponse = await apiResponse.json();
        logger.debug('API Response parsed', { hasResults: !!data.result });

        if (!data.result?.classification?.suggestions?.[0]) {
            throw new PlantIdError('No plant identified', 'NO_PLANT_FOUND');
        }

        const topSuggestion = data.result.classification.suggestions[0];
        const details = topSuggestion.details;

        const plantData: PlantIdentification = {
            id: `plant_${Date.now()}`,
            timestamp: Date.now(),
            imageUri,
            commonName: details.common_names?.[0] || topSuggestion.name,
            scientificName: topSuggestion.name,
            confidence: Math.round(topSuggestion.probability * 100),
            family: details.taxonomy?.family,
            genus: details.taxonomy?.genus,
            species: topSuggestion.name.split(' ').slice(1).join(' '),
            description: details.description?.value,
            careLevel: determineCareLevel(details),
            sunExposure: 'Bright indirect light',
            wateringSchedule: determineWateringSchedule(details.watering),
            soilType: 'Well-draining potting mix',
            toxicity: {
                dogs: false,
                cats: false,
                horses: false,
            },
            edible: !!(details.edible_parts && details.edible_parts.length > 0),
            medicinal: false,
            nativeHabitat: 'Various regions',
            bloomingSeason: ['Spring', 'Summer'],
            pollinators: ['Bees', 'Butterflies'],
            similarSpecies: topSuggestion.similar_images?.slice(0, 3).map((img) => ({
                name: topSuggestion.name,
                imageUrl: img.url_small,
                difference: `Similarity: ${Math.round(img.similarity * 100)}%`,
            })),
            saved: false,
        };

        logger.info('Plant identification successful', { commonName: plantData.commonName });
        return plantData;
    } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        logger.error('Error identifying plant', err);

        if (err.message.includes('Network request failed')) {
            throw new NetworkError();
        }

        throw error;
    }
}

interface PlantDetails {
    watering?: {
        min?: number;
        max?: number;
    };
    propagation_methods?: string[];
    growth_rate?: string;
}

function determineCareLevel(details: PlantDetails): 'Beginner' | 'Intermediate' | 'Expert' {
    // Determine care level based on watering frequency and growth characteristics
    const wateringFrequency = details.watering?.max || 7;
    const hasComplexPropagation = (details.propagation_methods?.length || 0) > 3;
    const isSlowGrowing = details.growth_rate === 'slow';

    if (wateringFrequency > 10 && !hasComplexPropagation && !isSlowGrowing) {
        return 'Beginner';
    }

    if (wateringFrequency <= 3 || hasComplexPropagation || isSlowGrowing) {
        return 'Expert';
    }

    return 'Intermediate';
}

function determineWateringSchedule(watering?: { min?: number; max?: number }): string {
    if (!watering) return 'Water when soil is dry';

    const { min, max } = watering;
    if (min && max) {
        const avg = (min + max) / 2;
        if (avg < 3) return 'Water frequently (every 1-2 days)';
        if (avg < 7) return 'Water regularly (every 3-5 days)';
        return 'Water occasionally (once a week)';
    }

    return 'Water when soil is dry';
}
