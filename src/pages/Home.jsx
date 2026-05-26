import { memo, useMemo } from "react";
import TvCard from "../components/TvCard.jsx";
import { isPlayableItem } from "../data/content.js";

function Home({ contentItems, onOpenDetails }) {
  const channels = useMemo(
    () => contentItems.filter((item) => item.type === "channel"),
    [contentItems],
  );
  const liveCount = useMemo(
    () => channels.filter((item) => isPlayableItem(item)).length,
    [channels],
  );

  return (
    <div className="home-page home-page--channels">
      <section className="channel-board" aria-labelledby="channel-board-title">
        <div className="channel-board-header">
          <div>
            <span className="eyebrow">Personal TV</span>
            <h1 id="channel-board-title">Live Channels</h1>
          </div>
          <div className="channel-board-stats" aria-label="Channel summary">
            <span>{liveCount} live</span>
            <span>{channels.length} total</span>
          </div>
        </div>

        <div className="channel-grid">
          {channels.map((item) => (
            <TvCard
              key={item.id}
              item={item}
              onSelect={onOpenDetails}
              size="compact"
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default memo(Home);
