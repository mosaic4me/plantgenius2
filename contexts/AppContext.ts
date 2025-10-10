import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PlantIdentification, GardenPlant } from '@/types/plant';
import { logger } from '@/utils/logger';
import { storageManager } from '@/utils/storage';

const HISTORY_KEY = '@plantgenius_history';
const GARDEN_KEY = '@plantgenius_garden';
const STATS_KEY = '@plantgenius_stats';

interface AppStats {
    totalScans: number;
    plantsInGarden: number;
}

interface AppContextValue {
    history: PlantIdentification[];
    garden: GardenPlant[];
    stats: AppStats;
    isLoading: boolean;
    addToHistory: (plant: PlantIdentification) => Promise<void>;
    removeFromHistory: (id: string) => Promise<void>;
    toggleSaved: (id: string) => Promise<void>;
    addToGarden: (plant: PlantIdentification) => Promise<void>;
    removeFromGarden: (id: string) => Promise<void>;
    updatePlantWatering: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [history, setHistory] = useState<PlantIdentification[]>([]);
    const [garden, setGarden] = useState<GardenPlant[]>([]);
    const [stats, setStats] = useState<AppStats>({ totalScans: 0, plantsInGarden: 0 });
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            const [historyData, gardenData, statsData] = await Promise.all([
                AsyncStorage.getItem(HISTORY_KEY),
                AsyncStorage.getItem(GARDEN_KEY),
                AsyncStorage.getItem(STATS_KEY),
            ]);

            if (historyData) setHistory(JSON.parse(historyData));
            if (gardenData) setGarden(JSON.parse(gardenData));
            if (statsData) setStats(JSON.parse(statsData));
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            logger.error('Error loading data', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const addToHistory = useCallback(async (plant: PlantIdentification) => {
        try {
            setHistory((prevHistory) => {
                const newHistory = [plant, ...prevHistory].slice(0, 50);
                storageManager.debouncedSetItem(HISTORY_KEY, JSON.stringify(newHistory));
                return newHistory;
            });

            setStats((prevStats) => {
                const newStats = { ...prevStats, totalScans: prevStats.totalScans + 1 };
                storageManager.debouncedSetItem(STATS_KEY, JSON.stringify(newStats));
                return newStats;
            });
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            logger.error('Error adding to history', err, { plantId: plant.id });
        }
    }, []);

    const removeFromHistory = useCallback(async (id: string) => {
        try {
            setHistory((prevHistory) => {
                const newHistory = prevHistory.filter((item) => item.id !== id);
                storageManager.debouncedSetItem(HISTORY_KEY, JSON.stringify(newHistory));
                return newHistory;
            });
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            logger.error('Error removing from history', err, { id });
        }
    }, []);

    const toggleSaved = useCallback(async (id: string) => {
        try {
            setHistory((prevHistory) => {
                const newHistory = prevHistory.map((item) =>
                    item.id === id ? { ...item, saved: !item.saved } : item
                );
                storageManager.debouncedSetItem(HISTORY_KEY, JSON.stringify(newHistory));
                return newHistory;
            });
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            logger.error('Error toggling saved', err, { id });
        }
    }, []);

    const addToGarden = useCallback(async (plant: PlantIdentification) => {
        try {
            const gardenPlant: GardenPlant = {
                ...plant,
                addedToGarden: Date.now(),
                healthStatus: 'healthy',
            };
            setGarden((prevGarden) => {
                const newGarden = [...prevGarden, gardenPlant];
                storageManager.debouncedSetItem(GARDEN_KEY, JSON.stringify(newGarden));

                setStats((prevStats) => {
                    const newStats = { ...prevStats, plantsInGarden: newGarden.length };
                    storageManager.debouncedSetItem(STATS_KEY, JSON.stringify(newStats));
                    return newStats;
                });

                return newGarden;
            });
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            logger.error('Error adding to garden', err, { plantId: plant.id });
        }
    }, []);

    const removeFromGarden = useCallback(async (id: string) => {
        try {
            setGarden((prevGarden) => {
                const newGarden = prevGarden.filter((item) => item.id !== id);
                storageManager.debouncedSetItem(GARDEN_KEY, JSON.stringify(newGarden));

                setStats((prevStats) => {
                    const newStats = { ...prevStats, plantsInGarden: newGarden.length };
                    storageManager.debouncedSetItem(STATS_KEY, JSON.stringify(newStats));
                    return newStats;
                });

                return newGarden;
            });
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            logger.error('Error removing from garden', err, { id });
        }
    }, []);

    const updatePlantWatering = useCallback(async (id: string) => {
        try {
            const now = Date.now();
            setGarden((prevGarden) => {
                const newGarden = prevGarden.map((item) =>
                    item.id === id
                        ? {
                            ...item,
                            lastWatered: now,
                            nextWateringDue: now + 7 * 24 * 60 * 60 * 1000,
                        }
                        : item
                );
                storageManager.debouncedSetItem(GARDEN_KEY, JSON.stringify(newGarden));
                return newGarden;
            });
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            logger.error('Error updating watering', err, { id });
        }
    }, []);

    const value = useMemo(() => ({
        history,
        garden,
        stats,
        isLoading,
        addToHistory,
        removeFromHistory,
        toggleSaved,
        addToGarden,
        removeFromGarden,
        updatePlantWatering,
    }), [history, garden, stats, isLoading, addToHistory, removeFromHistory, toggleSaved, addToGarden, removeFromGarden, updatePlantWatering]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}
