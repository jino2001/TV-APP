import { memo } from "react";
import TvCard from "../components/TvCard.jsx";

function Home({ contentItems, onPlay }) {
  return (
    <div className="home-page home-page--simple">
      <section className="channel-board" aria-label="Live TV channels">
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
