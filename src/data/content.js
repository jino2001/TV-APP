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

export const getContentInitials = (item) => {
  const title = item?.title?.trim() ?? "";

  if (!title) {
    return "";
  }

  return title
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
};

export const isPlayableItem = (item) =>
  Boolean(
    item?.isActive &&
      item?.streamUrl &&
      isKnownPlaybackType(getPlaybackType(item)),
  );

export const createContentRows = (items) =>
  ["Georgian Live TV", "Sports & Entertainment"]
    .map((category) => ({
      title: category,
      items: items
        .filter((item) => item.category === category)
        .sort(
          (first, second) =>
            (first.channelNumber ?? 999) - (second.channelNumber ?? 999),
        ),
    }))
    .filter((row) => row.items.length > 0);

// Add new personal TV channels here.
// Tokenized stream URLs may need to be refreshed if playback stops.
export const contentItems = [
  {
    id: "ge-1tv",
    channelNumber: 1,
    title: "Pirveli Arkhi",
    description: "Georgian Public Broadcaster live TV channel.",
    type: "channel",
    category: "Georgian Live TV",
    image: "https://1tv.ge/app/themes/wi-theme/resources/assets/img/logo/ge.svg",
    playbackType: "hls",
    streamUrl: "https://tv.cdn.xsg.ge/gpb-1tv/index.m3u8",
    epgId: "1TV.ge",
    isFavorite: false,
    isActive: true,
  },
  {
    id: "ge-imedi",
    channelNumber: 2,
    title: "Imedi TV",
    description: "Georgian live TV channel.",
    type: "channel",
    category: "Georgian Live TV",
    image: "https://bm.ge/uploads/files/2021/01/29/194581/6013ba500ab2b_w_h.jpeg",
    playbackType: "hls",
    streamUrl: "https://tv.cdn.xsg.ge/imedihd/index.m3u8",
    epgId: "ImediTV.ge",
    isFavorite: false,
    isActive: true,
    colors: ["#020617", "#dc2626", "#f97316"],
  },
  {
    id: "ge-formula",
    channelNumber: 3,
    title: "Formula TV",
    description: "Georgian live TV channel.",
    type: "channel",
    category: "Georgian Live TV",
    image: "https://i.imgur.com/fsqBn8G.png",
    playbackType: "hls",
    streamUrl: "https://c4635.cdn.xsg.ge/c4635/TVFormula/index.m3u8",
    epgId: "Formula.ge",
    isFavorite: false,
    isActive: true,
    colors: ["#111827", "#dc2626", "#f43f5e"],
  },
  {
    id: "ge-tv-pirveli",
    channelNumber: 4,
    title: "TV Pirveli",
    description: "",
    type: "channel",
    category: "Georgian Live TV",
    image: "https://i.imgur.com/cGHsM1x.png",
    playbackType: "hls",
    streamUrl: "https://live2.mar.tv/281a3fecc70e2fe6329eb4fbdbabc35d0b95789141396e31b171f3ccb5e5c4cd/8hd/index.m3u8",
    epgId: "TVPirveli.ge",
    isFavorite: false,
    isActive: true,
  },
  {
    id: "ge-silk-universal",
    channelNumber: 5,
    title: "Silk Universal",
    description: "Silk live TV channel.",
    type: "channel",
    category: "Georgian Live TV",
    image: "/silk-universal-logo.svg",
    playbackType: "hls",
    streamUrl: "https://live2.mar.tv/281a3fecc70e2fe6329eb4fbdbabc35d0b95789141396e31b171f3ccb5e5c4cd/silkuwow/index.m3u8",
    epgId: "SilkUniversal.ge",
    isFavorite: false,
    isActive: true,
  },
  {
    id: "ge-rustavi2",
    channelNumber: 6,
    title: "Rustavi 2",
    description: "Georgian live TV channel.",
    type: "channel",
    category: "Georgian Live TV",
    image: "https://upload.wikimedia.org/wikipedia/commons/f/f8/Rustavi_2_logo.png",
    playbackType: "hls",
    streamUrl: "https://live4.mar.tv/281a3fecc70e2fe6329eb4fbdbabc35d0b95789141396e31b171f3ccb5e5c4cd/4rd/index.m3u8",
    epgId: "Rustavi2.ge",
    isFavorite: false,
    isActive: true,
  },
  {
    id: "ge-euronews-georgia",
    channelNumber: 7,
    title: "Euronews Georgia",
    description: "Georgian live TV channel.",
    type: "channel",
    category: "Georgian Live TV",
    image: "https://i.imgur.com/VNJ4soR.png",
    playbackType: "hls",
    streamUrl: "https://tbs01-edge05.itdc.ge/euronewsgeorgia/tracks-v1a1/mono.m3u8?token=vAv-MjkYK-LQ7NaKWgE_S5EEuhQ-DT0Lv5lw10ssuMMEhGoQWMEuEBKm2g0GwgEzvN71ZHIYt1J2dJqGH9bRcCMvZWLzCA_pRPgwuqOrqmewn-8TMax07L2i1Hf5YMQTOaZ3HtUp3sg9VCUrOGCWlujaw9nrxqERtVQbrzqNGtAGUE7pUhJukDq7a33L38cbp44vkIz3VwIYazePetLy1-WAwqhO4m9Ivi6baN4OdRZnJVH-ZNk29NFpJa9HVDeFcUON70bGH9qHtdkyWyFJYA9LjJ3qVE82Cs41bSP4vgSSARy-ai0ekx09B33h04UC",
    epgId: "EuroNewsGeorgia.ge",
    isFavorite: false,
    isActive: true,
  },
];
