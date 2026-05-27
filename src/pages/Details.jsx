import FocusableButton from "../components/FocusableButton.jsx";
import {
  contentTypeLabels,
  getContentColors,
  isPlayableItem,
} from "../data/content.js";
import { getContentById } from "../utils/contentUtils.js";

export default function Details({
  contentItems,
  contentId,
  onBack,
  onPlay,
  onToggleFavorite,
}) {
  const content = getContentById(contentId, contentItems);

  if (!content) {
    return (
      <div className="details-page">
        <section className="details-hero details-hero--missing">
          <div className="details-copy">
            <span className="eyebrow">Unavailable</span>
            <h1>Channel not found</h1>
            <p className="description">
              This item is not available in local content data.
            </p>
            <div className="button-group">
              <FocusableButton variant="secondary" onClick={onBack}>
                Back
              </FocusableButton>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const playable = isPlayableItem(content);
  const colors = getContentColors(content);

  return (
    <div className="details-page">
      <section
        className="details-hero"
        style={{
          "--poster-start": colors[0],
          "--poster-mid": colors[1],
          "--poster-end": colors[2],
        }}
      >
        {content.image && (
          <img
            className="details-backdrop"
            src={content.image}
            alt=""
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        )}

        <div className="details-poster" aria-hidden="true">
          {content.image && (
            <img
              src={content.image}
              alt=""
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
          )}
          {content.channelNumber && (
            <span className="details-channel-number">
              {content.channelNumber}
            </span>
          )}
          <span>{content.title}</span>
        </div>

        <div className="details-copy">
          <span className="eyebrow">Channel {content.channelNumber}</span>
          <h1>{content.title}</h1>
          <div className="hero-meta">
            <span>{contentTypeLabels[content.type]}</span>
            <span>LIVE</span>
            {content.epgId && <span>{content.epgId}</span>}
            <span>{content.category}</span>
            {content.isFavorite && <span>Favorite</span>}
          </div>
          <p className="description">{content.description}</p>

          {!playable && (
            <p className="unavailable-message">
              Stream could not be loaded. Try again or choose another channel.
            </p>
          )}

          <div className="button-group">
            <FocusableButton
              disabled={!playable}
              onClick={() => onPlay(content.id)}
            >
              Watch Live
            </FocusableButton>
            <FocusableButton
              variant={content.isFavorite ? "secondary" : "primary"}
              onClick={() => onToggleFavorite(content.id)}
            >
              {content.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            </FocusableButton>
            <FocusableButton variant="secondary" onClick={onBack}>
              Back
            </FocusableButton>
          </div>
        </div>
      </section>
    </div>
  );
}
