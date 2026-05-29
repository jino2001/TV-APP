import { memo, useMemo } from "react";
import {
  getContentColors,
  getContentInitials,
  isPlayableItem,
} from "../data/content.js";

function getBadgeText(item) {
  if (item.type === "channel") {
    return isPlayableItem(item) ? "LIVE" : "";
  }

  return "";
}

function TvCard({ autoFocus = false, item, onSelect, size = "default" }) {
  const colors = getContentColors(item);
  const playable = isPlayableItem(item);
  const badgeText = getBadgeText(item);
  const initials = useMemo(() => getContentInitials(item), [item]);
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
        {badgeText && (
          <span className="card-badge card-badge--live">{badgeText}</span>
        )}
        <span className="poster-initials">{initials}</span>
      </span>

      <span className="card-copy">
        <span className="card-title">{item.title}</span>
      </span>
    </button>
  );
}

export default memo(TvCard);
