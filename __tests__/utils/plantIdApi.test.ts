import { identifyPlant, determineCareLevel } from '@/utils/plantIdApi';
import { compressImage } from '@/utils/imageProcessor';
import * as FileSystem from 'expo-file-system';

jest.mock('expo-file-system');
jest.mock('@/utils/imageProcessor');
jest.mock('@/utils/config', () => ({
  config: {
    plantIdApiKey: 'test-api-key',
    plantIdApiUrl: 'https://test.api.com',
  },
}));

describe('plantIdApi', () => {
  const mockCompressedImage = {
    uri: 'file://compressed.jpg',
    width: 800,
    height: 600,
    size: 50000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (compressImage as jest.Mock).mockResolvedValue(mockCompressedImage);
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('base64data');
    global.fetch = jest.fn();
  });

  describe('identifyPlant', () => {
    it('should compress image before identification', async () => {
      const mockResponse = {
        suggestions: [
          {
            plant_name: 'Monstera deliciosa',
            probability: 0.95,
            plant_details: {
              common_names: ['Swiss Cheese Plant'],
              url: 'https://example.com/monstera',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await identifyPlant('file://test.jpg');

      expect(compressImage).toHaveBeenCalledWith('file://test.jpg');
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(identifyPlant('file://test.jpg')).rejects.toThrow();
    });
  });

  describe('determineCareLevel', () => {
    it('should return Beginner for easy-care plants', () => {
      const details = {
        watering: { max: 14 },
        propagation_methods: ['cutting'],
        growth_rate: 'fast',
      };

      expect(determineCareLevel(details)).toBe('Beginner');
    });

    it('should return Expert for demanding plants', () => {
      const details = {
        watering: { max: 2 },
        propagation_methods: ['seed', 'cutting', 'division', 'layering'],
        growth_rate: 'slow',
      };

      expect(determineCareLevel(details)).toBe('Expert');
    });

    it('should return Intermediate for moderate plants', () => {
      const details = {
        watering: { max: 7 },
        propagation_methods: ['cutting', 'division'],
        growth_rate: 'moderate',
      };

      expect(determineCareLevel(details)).toBe('Intermediate');
    });
  });
});
