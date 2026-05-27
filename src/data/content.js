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
// Tokenized stream URLs may need to be refreshed if playback stops.
export const contentItems = [
  {
    id: "ge-1tv",
    channelNumber: 1,
    title: "First Channel / 1TV",
    description: "Georgian Public Broadcaster live TV channel.",
    type: "channel",
    category: "Georgian Live TV",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Pirveli_Arkhi_Logo_2022.svg/512px-Pirveli_Arkhi_Logo_2022.svg.png",
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
    image: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Imlogo_2020.png",
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
    description: "Georgian live TV channel.",
    type: "channel",
    category: "Georgian Live TV",
    image: "https://i.imgur.com/cGHsM1x.png",
    playbackType: "hls",
    streamUrl: "https://tbs01-edge34.itdc.ge/pirvelitv/tracks-v1a1/mono.m3u8?token=-la0jE1xZzCWrMr3R0Nf_85q_gwhcNe1irwkbgC0s0kZXEAjt7ehscP_n7D-he5lFk2U4Mp53FG9br49EEGYfXYtTtZakPg9aQeLS9n4L27J_fV41sOTbqLZTOG-rJQotx9KrryuCWUvd0LDgetv9Yr15lGzi0cmRpHakipQKwxH64a2NNT34eup6J6D5CKFNoZ2kKrk48uat_C00dAsNI3wSiGA8PgwXomCoN4P9p_YHeDP8zkONd-TT8auRoPtGU8g1sBv9YlVv5YIEoM1Cyvf6oP6uDKtzlWqCJOYW96I61FkQ7W5NkwsS34H_7Jt",
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
    image: "",
    playbackType: "hls",
    streamUrl: "https://tbs01-edge33.itdc.ge/silk_sport4/tracks-v1a1/mono.m3u8?token=wcmrqv2w3F3C_6SA-mOKqGPvlTZT6Ao3dkF2zKlm82SBN8jr8iI9IchryMWaSobcEs8eK5GyP2aoK8WMzybHULciK_BV4YCWAqv4X1pKuB6qmLQxi6Tc7vOUvIOYwF_YHSVjygQq-xm1mBDYHRZJ65SIM62hW_sZG_fBc2bbRL8XteESq2aMuDyKHJI_qHM4NqzSDVdwiWnTWkZDwikglm1JujeSmK_I2VrK6G5HiTwgbBDT1SiPVBDGVsRADhMJ4QpJZdF0wLErmE75rpv21a5y5h-1sXTRSEWuAcFzZ5RTpzxW3t11hDkpJSpWH9SH",
    epgId: "SilkUniversal.ge",
    isFavorite: false,
    isActive: true,
  },
];
