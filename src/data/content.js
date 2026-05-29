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
  const normalizedTitle = title.toLowerCase();

  if (!title) {
    return "";
  }

  if (title === "WPT") {
    return "WPT";
  }

  if (normalizedTitle === "mma tv") {
    return "MMA";
  }

  if (normalizedTitle === "futbol") {
    return "FB";
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
  {
    id: "ge-rustavi2",
    channelNumber: 6,
    title: "Rustavi 2",
    description: "Georgian live TV channel.",
    type: "channel",
    category: "Georgian Live TV",
    image: "https://upload.wikimedia.org/wikipedia/commons/f/f8/Rustavi_2_logo.png",
    playbackType: "hls",
    streamUrl: "https://tbs01-edge12.itdc.ge/rustavi2hqnew/tracks-v1a1/mono.m3u8?token=75cT9WVfGCG3FXMHG0tq2sVxJtNaqHBqBtzwN0IW1XsN-6_ayiihyPvfheHyNk7Sfzqj89UMsJs_RGm34qky3kSUHolsmHkKzUIw3MZGvWXizC14XVss7tZcEOf_yMlPuJZoPDvoHa-Voyq_-DaTE4C1XTvIexzwMStQ6oyHwNCcw3VQofinWRbjwbp8HcBLe55C9ptNtRC-IHrKP0mxW-KFvY4WWuXhCxmoZHhj22h7sXYRkZWycdklwPn8S5wMcJ2ulbB40U_KzX1CfCU1TjYQ5XNbfUTEbiun9BJknLXsOKsS80wmAceJXYugKrl5",
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
  {
    id: "wpt",
    channelNumber: 8,
    title: "WPT",
    description: "World Poker Tour live channel.",
    type: "channel",
    category: "Sports & Entertainment",
    image: "",
    playbackType: "hls",
    streamUrl: "https://d39g1vxj2ef6in.cloudfront.net/v1/manifest/3fec3e5cac39a52b2132f9c66c83dae043dc17d4/prod-rakuten-stitched/15d59f2f-80da-4448-9bce-775cc9f470f7/1.m3u8",
    epgId: "WPT",
    isFavorite: false,
    isActive: true,
  },
  {
    id: "mma-tv",
    channelNumber: 9,
    title: "MMA TV",
    description: "MMA live channel.",
    type: "channel",
    category: "Sports & Entertainment",
    image: "",
    playbackType: "hls",
    streamUrl: "https://streams2.sofast.tv/vglive-sk-462904/playlist.m3u8",
    epgId: "MMATV",
    isFavorite: false,
    isActive: true,
  },
  {
    id: "futbol",
    channelNumber: 10,
    title: "Futbol",
    description: "Football live channel.",
    type: "channel",
    category: "Sports & Entertainment",
    image: "",
    playbackType: "hls",
    streamUrl: "https://live.teleradiocom.tj/8/3m.m3u8",
    epgId: "Futbol",
    isFavorite: false,
    isActive: true,
  },
];
