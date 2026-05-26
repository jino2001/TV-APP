import { memo, useMemo } from "react";
import TvCard from "./TvCard.jsx";

function ContentRow({ title, items, onSelect }) {
  const rowId = useMemo(
    () => `${title.toLowerCase().replace(/\s+/g, "-")}-row`,
    [title],
  );

  return (
    <section className="content-row" aria-labelledby={rowId}>
      <div className="row-heading">
        <h2 id={rowId}>{title}</h2>
        <span>{items.length} items</span>
      </div>

      <div className="row-scroller">
        {items.length > 0 ? (
          items.map((item) => (
            <TvCard key={item.id} item={item} onSelect={onSelect} />
          ))
        ) : (
          <div className="empty-row">
            <strong>No favorites yet</strong>
            <span>Open any item and add it to Favorites.</span>
          </div>
        )}
      </div>
    </section>
  );
}

export default memo(ContentRow);
