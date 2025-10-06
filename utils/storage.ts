import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

type StorageCallback = () => void;

class StorageManager {
  private pendingWrites: Map<string, { data: string; timeout: NodeJS.Timeout }> = new Map();
  private readonly DEBOUNCE_DELAY = 500; // milliseconds

  /**
   * Debounced write to AsyncStorage
   * Delays writes to reduce I/O operations
   */
  debouncedSetItem(key: string, value: string, callback?: StorageCallback): void {
    // Clear existing timeout for this key
    const pending = this.pendingWrites.get(key);
    if (pending) {
      clearTimeout(pending.timeout);
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(key, value);
        this.pendingWrites.delete(key);
        callback?.();
        logger.debug('Debounced storage write complete', { key, size: value.length });
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        logger.error('Error in debounced storage write', err, { key });
      }
    }, this.DEBOUNCE_DELAY);

    this.pendingWrites.set(key, { data: value, timeout });
  }

  /**
   * Immediately flushes all pending writes
   */
  async flush(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [key, { data, timeout }] of this.pendingWrites.entries()) {
      clearTimeout(timeout);
      promises.push(
        AsyncStorage.setItem(key, data).then(() => {
          this.pendingWrites.delete(key);
          logger.debug('Flushed storage write', { key });
        })
      );
    }

    await Promise.all(promises);
  }

  /**
   * Batch write multiple items
   */
  async setMultiple(keyValuePairs: [string, string][]): Promise<void> {
    try {
      await AsyncStorage.multiSet(keyValuePairs);
      logger.debug('Batch storage write complete', { count: keyValuePairs.length });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Error in batch storage write', err, { count: keyValuePairs.length });
      throw error;
    }
  }

  /**
   * Batch read multiple items
   */
  async getMultiple(keys: string[]): Promise<Map<string, string | null>> {
    try {
      const result = await AsyncStorage.multiGet(keys);
      const map = new Map<string, string | null>();

      result.forEach(([key, value]) => {
        map.set(key, value);
      });

      logger.debug('Batch storage read complete', { count: keys.length });
      return map;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Error in batch storage read', err, { count: keys.length });
      throw error;
    }
  }

  /**
   * Clear all storage (use with caution)
   */
  async clear(): Promise<void> {
    try {
      // Flush pending writes first
      await this.flush();

      // Clear all storage
      await AsyncStorage.clear();
      logger.warn('Storage cleared');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Error clearing storage', err);
      throw error;
    }
  }
}

export const storageManager = new StorageManager();
