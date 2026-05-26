export const contentTypeLabels = {
  channel: "Channel",
  movie: "Movie",
  sport: "Sport",
};

export const playbackTypeLabels = {
  hls: "HLS Stream",
  iframe: "Official Player",
  external: "External Player",
};

export const playbackActionLabels = {
  hls: "Play",
  iframe: "Watch",
  external: "Open Live",
};

export const getContentColors = (item) =>
  item?.colors ?? ["#020617", "#2563eb", "#14b8a6"];

export const getPlaybackType = (item) => item?.playbackType ?? "hls";

export const isKnownPlaybackType = (playbackType) =>
  ["hls", "iframe", "external"].includes(playbackType);

export const getContentStreamUrls = (item) =>
  [item?.streamUrl, ...(item?.backupStreamUrls ?? [])].filter(Boolean);

export const isPlayableItem = (item) =>
  Boolean(
    item?.isActive &&
      item?.streamUrl &&
      isKnownPlaybackType(getPlaybackType(item)),
  );

export const createContentRows = (items) => [
  {
    title: "Georgian Live TV",
    items: items.filter((item) => item.category === "Georgian Live TV"),
  },
];

// Add new personal TV channels here.
export const contentItems = [
  {
    id: "ge-imedi",
    title: "Imedi TV",
    description: "Georgian live TV channel.",
    type: "channel",
    category: "Georgian Live TV",
    image: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Imlogo_2020.png",
    playbackType: "hls",
    streamUrl: "https://tv.cdn.xsg.ge/imedihd/index.m3u8",
    backupStreamUrls: ["http://tv2.stream.ge:8081/live/imedi/index.m3u8"],
    epgId: "ImediTV.ge",
    isFavorite: false,
    isActive: true,
    colors: ["#020617", "#dc2626", "#f97316"],
    progress: 0,
  },
  {
    id: "ge-formula",
    title: "Formula TV",
    description: "Georgian live TV channel.",
    type: "channel",
    category: "Georgian Live TV",
    image: "https://i.imgur.com/fsqBn8G.png",
    playbackType: "hls",
    streamUrl: "https://c4635.cdn.xsg.ge/c4635/TVFormula/index.m3u8",
    backupStreamUrls: ["http://tv2.stream.ge:8081/live/formula/index.m3u8"],
    epgId: "Formula.ge",
    isFavorite: false,
    isActive: true,
    colors: ["#111827", "#dc2626", "#f43f5e"],
    progress: 0,
  },
];
