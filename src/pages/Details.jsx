import ContentRow from "../components/ContentRow.jsx";
import FocusableButton from "../components/FocusableButton.jsx";
import {
  contentTypeLabels,
  getContentColors,
  getPlaybackType,
  isPlayableItem,
  playbackActionLabels,
  playbackTypeLabels,
} from "../data/content.js";
import { getContentById } from "../utils/contentUtils.js";

export default function Details({
  contentItems,
  contentId,
  onBack,
  onOpenDetails,
  onPlay,
  onToggleFavorite,
}) {
  const content = getContentById(contentId, contentItems) ?? contentItems[0];
  const playable = isPlayableItem(content);
  const playbackType = getPlaybackType(content);
  const streamKind = playbackTypeLabels[playbackType] ?? "Unknown Player";
  const playButtonText = playbackActionLabels[playbackType] ?? "Play";

  const relatedItems = contentItems.filter(
    (item) => item.id !== content.id && item.category === content.category,
  );

  const fallbackItems = contentItems
    .filter((item) => item.id !== content.id)
    .slice(0, 4);
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
          <span>{content.title}</span>
        </div>

        <div className="details-copy">
          <span className="eyebrow">{content.category}</span>
          <h1>{content.title}</h1>
          <div className="hero-meta">
            <span>{contentTypeLabels[content.type]}</span>
            <span>{content.category}</span>
            {content.epgId && <span>{content.epgId}</span>}
            <span>{playable ? "LIVE" : "Unavailable"}</span>
            {content.isFavorite && <span>Favorite</span>}
            {content.streamUrl && <span>{streamKind}</span>}
          </div>
          <p className="description">{content.description}</p>
          <p className={`stream-url ${playable ? "" : "stream-url--missing"}`}>
            {content.streamUrl ?? "This channel is currently unavailable."}
          </p>

          {!playable && (
            <p className="unavailable-message">
              This channel is currently unavailable.
            </p>
          )}

          <div className="button-group">
            <FocusableButton
              disabled={!playable}
              onClick={() => onPlay(content.id)}
            >
              {playButtonText}
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

      <ContentRow
        title={relatedItems.length > 0 ? "More Like This" : "More To Watch"}
        items={relatedItems.length > 0 ? relatedItems : fallbackItems}
        onSelect={onOpenDetails}
      />
    </div>
  );
}
