import Taro from '@tarojs/taro';

const STORAGE_KEYS = {
  RATE_RULES: 'rental_station_rate_rules',
  PENALTY_RULES: 'rental_station_penalty_rules',
  BILLING_CONFIG: 'rental_station_billing_config',
  EQUIPMENTS: 'rental_station_equipments',
  ORDERS: 'rental_station_orders',
  NEAR_EXPIRY_DAYS: 'rental_station_near_expiry_days'
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

export const saveToStorage = <T>(key: StorageKey, data: T): void => {
  try {
    Taro.setStorageSync(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
    console.log('[Storage] saved:', key);
  } catch (err) {
    console.error('[Storage] save error:', key, err);
  }
};

export const loadFromStorage = <T>(key: StorageKey): T | null => {
  try {
    const raw = Taro.getStorageSync(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    console.log('[Storage] loaded:', key);
    return parsed.data as T;
  } catch (err) {
    console.error('[Storage] load error:', key, err);
    return null;
  }
};

export const clearStorage = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    try {
      Taro.removeStorageSync(key);
    } catch (err) {
      console.error('[Storage] clear error:', key, err);
    }
  });
  console.log('[Storage] all cleared');
};

export { STORAGE_KEYS };
