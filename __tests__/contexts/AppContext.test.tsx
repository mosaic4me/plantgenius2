import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppProvider, useApp } from '@/contexts/AppContext';
import type { PlantIdentification, GardenPlant } from '@/types/plant';

// Mock storage manager
jest.mock('@/utils/storage', () => ({
  storageManager: {
    debouncedSetItem: jest.fn((key, value) => {
      AsyncStorage.setItem(key, value);
    }),
    flush: jest.fn(),
  },
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AppContext', () => {
  const mockPlant: PlantIdentification = {
    id: 'plant-1',
    scientificName: 'Monstera deliciosa',
    commonNames: ['Swiss Cheese Plant', 'Monstera'],
    probability: 0.95,
    imageUrl: 'https://example.com/monstera.jpg',
    description: 'A popular houseplant',
    careInstructions: {
      watering: 'Weekly',
      sunlight: 'Indirect light',
      temperature: '18-27°C',
    },
    timestamp: Date.now(),
    saved: false,
  };

  const mockGardenPlant: GardenPlant = {
    ...mockPlant,
    addedToGarden: Date.now(),
    healthStatus: 'healthy',
    lastWatered: Date.now(),
    nextWateringDue: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with empty data', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.history).toEqual([]);
      expect(result.current.garden).toEqual([]);
      expect(result.current.stats).toEqual({ totalScans: 0, plantsInGarden: 0 });
    });

    it('should load existing data from AsyncStorage', async () => {
      const existingHistory = [mockPlant];
      const existingStats = { totalScans: 5, plantsInGarden: 2 };

      await AsyncStorage.setItem('@plantgenius_history', JSON.stringify(existingHistory));
      await AsyncStorage.setItem('@plantgenius_stats', JSON.stringify(existingStats));

      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.history).toEqual(existingHistory);
      expect(result.current.stats).toEqual(existingStats);
    });

    it('should handle corrupted data gracefully', async () => {
      await AsyncStorage.setItem('@plantgenius_history', 'invalid json');

      const { result } = renderHook(() => useApp(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should use empty defaults when parsing fails
      expect(result.current.history).toEqual([]);
    });
  });

  describe('History Management', () => {
    it('should add plant to history', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addToHistory(mockPlant);
      });

      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0]).toEqual(mockPlant);
      expect(result.current.stats.totalScans).toBe(1);
    });

    it('should add new plants to the beginning of history', async () => {
      const plant1: PlantIdentification = { ...mockPlant, id: 'plant-1' };
      const plant2: PlantIdentification = { ...mockPlant, id: 'plant-2' };

      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addToHistory(plant1);
        await result.current.addToHistory(plant2);
      });

      expect(result.current.history[0].id).toBe('plant-2');
      expect(result.current.history[1].id).toBe('plant-1');
    });

    it('should limit history to 50 items', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add 55 plants
      await act(async () => {
        for (let i = 0; i < 55; i++) {
          await result.current.addToHistory({
            ...mockPlant,
            id: `plant-${i}`,
          });
        }
      });

      expect(result.current.history).toHaveLength(50);
      // Most recent should be first
      expect(result.current.history[0].id).toBe('plant-54');
      // Oldest should be plant-5 (plants 0-4 should be removed)
      expect(result.current.history[49].id).toBe('plant-5');
    });

    it('should remove plant from history', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addToHistory(mockPlant);
      });

      expect(result.current.history).toHaveLength(1);

      await act(async () => {
        await result.current.removeFromHistory(mockPlant.id);
      });

      expect(result.current.history).toHaveLength(0);
    });

    it('should toggle saved status', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addToHistory(mockPlant);
      });

      expect(result.current.history[0].saved).toBe(false);

      await act(async () => {
        await result.current.toggleSaved(mockPlant.id);
      });

      expect(result.current.history[0].saved).toBe(true);

      await act(async () => {
        await result.current.toggleSaved(mockPlant.id);
      });

      expect(result.current.history[0].saved).toBe(false);
    });
  });

  describe('Garden Management', () => {
    it('should add plant to garden', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addToGarden(mockPlant);
      });

      expect(result.current.garden).toHaveLength(1);
      expect(result.current.garden[0]).toMatchObject({
        ...mockPlant,
        healthStatus: 'healthy',
      });
      expect(result.current.garden[0].addedToGarden).toBeDefined();
      expect(result.current.stats.plantsInGarden).toBe(1);
    });

    it('should remove plant from garden', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addToGarden(mockPlant);
      });

      expect(result.current.garden).toHaveLength(1);
      expect(result.current.stats.plantsInGarden).toBe(1);

      await act(async () => {
        await result.current.removeFromGarden(mockPlant.id);
      });

      expect(result.current.garden).toHaveLength(0);
      expect(result.current.stats.plantsInGarden).toBe(0);
    });

    it('should update plant watering', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addToGarden(mockPlant);
      });

      const beforeWatering = result.current.garden[0].lastWatered;

      // Wait a tick to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      await act(async () => {
        await result.current.updatePlantWatering(mockPlant.id);
      });

      const afterWatering = result.current.garden[0].lastWatered;

      expect(afterWatering).toBeGreaterThan(beforeWatering || 0);
      expect(result.current.garden[0].nextWateringDue).toBeGreaterThan(afterWatering!);
    });

    it('should calculate next watering date correctly', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const now = Date.now();

      await act(async () => {
        await result.current.addToGarden(mockPlant);
        await result.current.updatePlantWatering(mockPlant.id);
      });

      const nextWatering = result.current.garden[0].nextWateringDue!;
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

      // Should be approximately 7 days from now (within 1 second tolerance)
      expect(nextWatering - now).toBeGreaterThan(sevenDaysInMs - 1000);
      expect(nextWatering - now).toBeLessThan(sevenDaysInMs + 1000);
    });
  });

  describe('Stats Tracking', () => {
    it('should increment total scans when adding to history', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.stats.totalScans).toBe(0);

      await act(async () => {
        await result.current.addToHistory(mockPlant);
      });

      expect(result.current.stats.totalScans).toBe(1);

      await act(async () => {
        await result.current.addToHistory({ ...mockPlant, id: 'plant-2' });
      });

      expect(result.current.stats.totalScans).toBe(2);
    });

    it('should update garden count when adding plants', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.stats.plantsInGarden).toBe(0);

      await act(async () => {
        await result.current.addToGarden(mockPlant);
      });

      expect(result.current.stats.plantsInGarden).toBe(1);

      await act(async () => {
        await result.current.addToGarden({ ...mockPlant, id: 'plant-2' });
      });

      expect(result.current.stats.plantsInGarden).toBe(2);
    });

    it('should update garden count when removing plants', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addToGarden({ ...mockPlant, id: 'plant-1' });
        await result.current.addToGarden({ ...mockPlant, id: 'plant-2' });
        await result.current.addToGarden({ ...mockPlant, id: 'plant-3' });
      });

      expect(result.current.stats.plantsInGarden).toBe(3);

      await act(async () => {
        await result.current.removeFromGarden('plant-2');
      });

      expect(result.current.stats.plantsInGarden).toBe(2);
    });
  });

  describe('Storage Persistence', () => {
    it('should persist history to AsyncStorage', async () => {
      const { storageManager } = require('@/utils/storage');

      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addToHistory(mockPlant);
      });

      expect(storageManager.debouncedSetItem).toHaveBeenCalledWith(
        '@plantgenius_history',
        expect.stringContaining(mockPlant.id)
      );
    });

    it('should persist garden to AsyncStorage', async () => {
      const { storageManager } = require('@/utils/storage');

      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addToGarden(mockPlant);
      });

      expect(storageManager.debouncedSetItem).toHaveBeenCalledWith(
        '@plantgenius_garden',
        expect.stringContaining(mockPlant.id)
      );
    });

    it('should persist stats to AsyncStorage', async () => {
      const { storageManager } = require('@/utils/storage');

      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addToHistory(mockPlant);
      });

      expect(storageManager.debouncedSetItem).toHaveBeenCalledWith(
        '@plantgenius_stats',
        expect.stringContaining('"totalScans":1')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle AsyncStorage errors gracefully', async () => {
      const { logger } = require('@/utils/logger');

      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));

      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Error loading data',
        expect.any(Error)
      );

      // Should still work with empty data
      expect(result.current.history).toEqual([]);
      expect(result.current.garden).toEqual([]);
    });

    it('should log errors when adding to history fails', async () => {
      const { logger } = require('@/utils/logger');
      const { storageManager } = require('@/utils/storage');

      storageManager.debouncedSetItem.mockImplementationOnce(() => {
        throw new Error('Storage failed');
      });

      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addToHistory(mockPlant);
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Error adding to history',
        expect.any(Error),
        { plantId: mockPlant.id }
      );
    });
  });
});
