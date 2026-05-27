import { memo } from "react";
import TvCard from "../components/TvCard.jsx";

function Home({ contentItems, onPlay }) {
  return (
    <div className="home-page home-page--simple">
      <section className="channel-board" aria-labelledby="channel-board-title">
        <div className="channel-board-header">
          <div>
            <span className="eyebrow">Personal TV</span>
            <h1 id="channel-board-title">Georgian Live TV</h1>
          </div>
          <div className="channel-board-stats" aria-label="Channel summary">
            <span>5 channels</span>
            <span>Press 1-5</span>
          </div>
        </div>

        <div className="channel-grid channel-grid--home">
          {contentItems.map((item, index) => (
            <TvCard
              key={item.id}
              autoFocus={index === 0}
              item={item}
              onSelect={onPlay}
              size="compact"
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default memo(Home);
