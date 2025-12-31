import {
  clear,
  createStore,
  get,
  keys,
  set,
} from 'idb-keyval';
import type { Nutrients } from '../nutrition/nutrients';

export type CachedFood = {
  fdcId: number;
  description: string;
  brandOwner?: string | null;
  nutrientsPer100g: Nutrients;
  portions?: Array<{ amount: number; unit: string; gramWeight?: number }>;
  cachedAt: number;
};

const STORE = createStore('january-meal-plan', 'usda-cache');
const META_KEY = '__meta__';
export const CACHE_VERSION = 1;

let versionChecked = false;

const buildKey = (fdcId: number) => `food:${fdcId}`;

const ensureVersion = async () => {
  if (versionChecked) return;

  const meta = (await get(META_KEY, STORE)) as
    | { version: number }
    | undefined;

  if (!meta || meta.version !== CACHE_VERSION) {
    await clear(STORE);
    await set(
      META_KEY,
      { version: CACHE_VERSION, updatedAt: Date.now() },
      STORE
    );
  }

  versionChecked = true;
};

export const getFood = async (
  fdcId: number
): Promise<CachedFood | undefined> => {
  await ensureVersion();
  return (await get(buildKey(fdcId), STORE)) as CachedFood | undefined;
};

export const setFood = async (
  fdcId: number,
  food: Omit<CachedFood, 'cachedAt'>
) => {
  await ensureVersion();
  const payload: CachedFood = {
    ...food,
    cachedAt: Date.now(),
  };
  await set(buildKey(fdcId), payload, STORE);
};

export const searchCache = async (query: string) => {
  await ensureVersion();
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const storeKeys = await keys(STORE);
  const matches: CachedFood[] = [];

  for (const key of storeKeys) {
    if (key === META_KEY || typeof key !== 'string') continue;
    const record = (await get(key, STORE)) as CachedFood | undefined;
    if (
      record &&
      record.description?.toLowerCase().includes(normalized)
    ) {
      matches.push(record);
    }
  }

  return matches;
};
