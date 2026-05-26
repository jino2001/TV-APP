import { contentItems, getContentStreamUrls } from "../data/content.js";

export function getContentById(id, items = contentItems) {
  return items.find((item) => item.id === id) ?? null;
}

export function getContentByCategory(category, items = contentItems) {
  return items.filter((item) => item.category === category);
}

export function getGeorgianLiveChannels(items = contentItems) {
  return getContentByCategory("Georgian Live TV", items);
}

export function getActiveChannels(items = contentItems) {
  return items.filter(
    (item) =>
      item.type === "channel" &&
      item.isActive &&
      getContentStreamUrls(item).length > 0,
  );
}

export function getFavoriteItems(items = contentItems) {
  return items.filter((item) => item.isFavorite);
}
