import { memo, useMemo } from "react";
import {
  contentTypeLabels,
  getContentColors,
  isPlayableItem,
} from "../data/content.js";

function getBadgeText(item) {
  if (item.type === "channel") {
    return isPlayableItem(item) ? "LIVE" : "Unavailable";
  }

  return item.isFavorite ? "Favorite" : contentTypeLabels[item.type];
}

function TvCard({ autoFocus = false, item, onSelect, size = "default" }) {
  const colors = getContentColors(item);
  const playable = isPlayableItem(item);
  const initials = useMemo(
    () =>
      item.title
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2),
    [item.title],
  );
  const style = useMemo(
    () => ({
      "--poster-start": colors[0],
      "--poster-mid": colors[1],
      "--poster-end": colors[2],
    }),
    [colors],
  );

  return (
    <button
      type="button"
      data-tv-focusable="true"
      data-tv-autofocus={autoFocus ? "true" : undefined}
      className={`tv-card tv-card--${size} ${playable ? "" : "tv-card--inactive"}`}
      onClick={() => onSelect(item.id)}
      aria-label={`Channel ${item.channelNumber}: ${item.title}`}
      style={style}
    >
      <span className="poster-art" aria-hidden="true">
        {item.image && (
          <img
            className="poster-image"
            src={item.image}
            alt=""
            decoding="async"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        )}
        <span className="poster-shine" />
        {item.channelNumber && (
          <span className="channel-number-badge">{item.channelNumber}</span>
        )}
        <span
          className={`card-badge ${playable ? "card-badge--live" : "card-badge--unavailable"}`}
        >
          {getBadgeText(item)}
        </span>
        {item.isFavorite && <span className="favorite-marker">FAV</span>}
        <span className="poster-initials">{initials}</span>
      </span>

      <span className="card-copy">
        <span className="card-title">{item.title}</span>
        <span className="card-meta">
          Channel {item.channelNumber} / {contentTypeLabels[item.type]}
        </span>
      </span>

      {item.progress > 0 && (
        <span className="progress-track" aria-hidden="true">
          <span
            className="progress-fill"
            style={{ width: `${item.progress}%` }}
          />
        </span>
      )}
    </button>
  );
}

export default memo(TvCard);
