import { contentItems, getContentStreamUrls } from "../data/content.js";
import {
  getActiveChannels as getSortedActiveChannels,
  getNextChannel as getSortedNextChannel,
  getPreviousChannel as getSortedPreviousChannel,
} from "./channelUtils.js";

export function getContentById(id, items = contentItems) {
  return items.find((item) => item.id === id) ?? null;
}

export function getContentByCategory(category, items = contentItems) {
  return items.filter((item) => item.category === category);
}

export function getGeorgianLiveChannels(items = contentItems) {
  return getContentByCategory("Georgian Live TV", items).sort(
    (first, second) =>
      (first.channelNumber ?? 999) - (second.channelNumber ?? 999),
  );
}

export function getActiveChannels(items = contentItems) {
  return getSortedActiveChannels(items);
}

export function getChannelIndex(id, items = contentItems) {
  return getActiveChannels(items).findIndex((item) => item.id === id);
}

export function getPreviousChannel(id, items = contentItems) {
  return getSortedPreviousChannel(id, items);
}

export function getNextChannel(id, items = contentItems) {
  return getSortedNextChannel(id, items);
}

export function getFavoriteItems(items = contentItems) {
  return items.filter((item) => item.isFavorite);
}

export function getRecentlyWatchedItems(ids = [], items = contentItems) {
  return ids
    .map((id) => getContentById(id, items))
    .filter(Boolean)
    .filter((item) => getContentStreamUrls(item).length > 0);
}
