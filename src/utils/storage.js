import { contentItems } from "../data/content.js";

export const STORAGE_KEYS = {
  favorites: "personal-tv-favorites",
  recentlyWatched: "personal-tv-recently-watched",
  lastChannel: "personal-tv-last-channel",
  settings: "personal-tv-settings",
};

export const defaultSettings = {
  autoplayLastChannel: false,
  showRecentlyWatched: true,
  performanceMode: true,
};

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function getValidIdSet(items = contentItems) {
  return new Set(items.map((item) => item.id));
}

function readJson(key, fallbackValue) {
  if (!canUseStorage()) {
    return fallbackValue;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function writeJson(key, value) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the current session usable when storage is unavailable.
  }
}

export function getDefaultFavoriteIds(items = contentItems) {
  return items.filter((item) => item.isFavorite).map((item) => item.id);
}

export function readFavoriteIds(items = contentItems) {
  const validIds = getValidIdSet(items);
  const savedIds = readJson(STORAGE_KEYS.favorites, null);
  const sourceIds = Array.isArray(savedIds)
    ? savedIds
    : getDefaultFavoriteIds(items);

  return sourceIds.filter((id) => validIds.has(id));
}

export function saveFavoriteIds(ids) {
  writeJson(STORAGE_KEYS.favorites, ids);
}

export function readRecentlyWatchedIds(items = contentItems) {
  const validIds = getValidIdSet(items);
  const savedIds = readJson(STORAGE_KEYS.recentlyWatched, []);

  if (!Array.isArray(savedIds)) {
    return [];
  }

  return savedIds.filter((id) => validIds.has(id)).slice(0, 10);
}

export function saveRecentlyWatchedIds(ids) {
  writeJson(STORAGE_KEYS.recentlyWatched, ids.slice(0, 10));
}

export function addRecentlyWatchedId(currentIds, id, items = contentItems) {
  if (!id || !getValidIdSet(items).has(id)) {
    return currentIds;
  }

  return [id, ...currentIds.filter((currentId) => currentId !== id)].slice(
    0,
    10,
  );
}

export function readLastChannelId(items = contentItems) {
  const savedId = readJson(STORAGE_KEYS.lastChannel, null);
  return savedId && getValidIdSet(items).has(savedId) ? savedId : null;
}

export function saveLastChannelId(id) {
  writeJson(STORAGE_KEYS.lastChannel, id);
}

export function readSettings() {
  const savedSettings = readJson(STORAGE_KEYS.settings, {});

  if (!savedSettings || typeof savedSettings !== "object") {
    return defaultSettings;
  }

  return {
    ...defaultSettings,
    autoplayLastChannel: Boolean(savedSettings.autoplayLastChannel),
    showRecentlyWatched:
      savedSettings.showRecentlyWatched === undefined
        ? defaultSettings.showRecentlyWatched
        : Boolean(savedSettings.showRecentlyWatched),
    performanceMode:
      savedSettings.performanceMode === undefined
        ? defaultSettings.performanceMode
        : Boolean(savedSettings.performanceMode),
  };
}

export function saveSettings(settings) {
  writeJson(STORAGE_KEYS.settings, settings);
}

export function clearFavoriteStorage() {
  saveFavoriteIds([]);
}

export function clearRecentlyWatchedStorage() {
  saveRecentlyWatchedIds([]);
}
