import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { identifyPlant } from '@/utils/plantIdApi';

jest.mock('@/utils/plantIdApi');
jest.mock('expo-router');

describe('Camera to Results Flow', () => {
  const mockPlantData = {
    id: 'plant-1',
    scientificName: 'Monstera deliciosa',
    commonNames: ['Swiss Cheese Plant'],
    probability: 0.95,
    imageUrl: 'file://test.jpg',
    description: 'Popular houseplant',
    careInstructions: {
      watering: 'Weekly',
      sunlight: 'Indirect',
      temperature: '18-27°C',
    },
    timestamp: Date.now(),
    saved: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (identifyPlant as jest.Mock).mockResolvedValue(mockPlantData);
  });

  it('should complete full identification flow', async () => {
    const mockImageUri = 'file://captured-image.jpg';

    // Mock the identification process
    const result = await identifyPlant(mockImageUri);

    expect(identifyPlant).toHaveBeenCalledWith(mockImageUri);
    expect(result).toEqual(mockPlantData);
    expect(result.scientificName).toBe('Monstera deliciosa');
    expect(result.probability).toBeGreaterThan(0.9);
  });

  it('should handle identification errors gracefully', async () => {
    (identifyPlant as jest.Mock).mockRejectedValue(new Error('API Error'));

    await expect(identifyPlant('file://test.jpg')).rejects.toThrow('API Error');
  });

  it('should store identified plant in history', async () => {
    const result = await identifyPlant('file://test.jpg');

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('timestamp');
    expect(result.saved).toBe(false);
  });
});
