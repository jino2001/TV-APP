import { contentItems, isPlayableItem } from "../data/content.js";

function byChannelNumber(first, second) {
  return (first.channelNumber ?? 999) - (second.channelNumber ?? 999);
}

export function getActiveChannels(items = contentItems) {
  return items
    .filter((item) => item.type === "channel" && isPlayableItem(item))
    .sort(byChannelNumber);
}

export function getChannelByNumber(number, items = contentItems) {
  const channelNumber = Number(number);
  return (
    getActiveChannels(items).find(
      (item) => item.channelNumber === channelNumber,
    ) ?? null
  );
}

export function getChannelById(id, items = contentItems) {
  return getActiveChannels(items).find((item) => item.id === id) ?? null;
}

export function getNextChannel(currentId, items = contentItems) {
  const channels = getActiveChannels(items);

  if (channels.length === 0) {
    return null;
  }

  const currentIndex = channels.findIndex((item) => item.id === currentId);
  const normalizedIndex = currentIndex >= 0 ? currentIndex : 0;
  return channels[(normalizedIndex + 1) % channels.length];
}

export function getPreviousChannel(currentId, items = contentItems) {
  const channels = getActiveChannels(items);

  if (channels.length === 0) {
    return null;
  }

  const currentIndex = channels.findIndex((item) => item.id === currentId);
  const normalizedIndex = currentIndex >= 0 ? currentIndex : 0;
  return channels[
    (normalizedIndex - 1 + channels.length) % channels.length
  ];
}
