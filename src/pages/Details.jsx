import FocusableButton from "../components/FocusableButton.jsx";
import {
  getContentColors,
  getContentInitials,
  isPlayableItem,
} from "../data/content.js";
import { getContentById } from "../utils/contentUtils.js";

export default function Details({
  contentItems,
  contentId,
  onBack,
  onPlay,
}) {
  const content = getContentById(contentId, contentItems);

  if (!content) {
    return (
      <div className="details-page">
        <section className="details-hero details-hero--missing">
          <div className="details-copy">
            <h1>არ მოიძებნა</h1>
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
  const fallbackInitials = getContentInitials(content);

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
          {!content.image && fallbackInitials && (
            <span className="details-poster-initials">{fallbackInitials}</span>
          )}
          {content.channelNumber && (
            <span className="details-channel-number">
              {content.channelNumber}
            </span>
          )}
          <span>{content.title}</span>
        </div>

        <div className="details-copy">
          <h1>{content.title}</h1>
          <div className="hero-meta">
            <span>{content.channelNumber}</span>
            <span>LIVE</span>
          </div>

          <div className="button-group">
            <FocusableButton
              disabled={!playable}
              onClick={() => onPlay(content.id)}
            >
              Watch Live
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
