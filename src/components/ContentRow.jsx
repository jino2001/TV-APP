import { memo, useMemo } from "react";
import TvCard from "./TvCard.jsx";

function ContentRow({
  autoFocusFirst = false,
  title,
  items,
  onSelect,
  size = "default",
}) {
  const rowId = useMemo(
    () => `${title.toLowerCase().replace(/\s+/g, "-")}-row`,
    [title],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="content-row" aria-labelledby={rowId}>
      <div className="row-heading">
        <h2 id={rowId}>{title}</h2>
        <span>{items.length} items</span>
      </div>

      <div className="row-scroller">
        {items.map((item, index) => (
          <TvCard
            key={item.id}
            autoFocus={autoFocusFirst && index === 0}
            item={item}
            onSelect={onSelect}
            size={size}
          />
        ))}
      </div>
    </section>
  );
}

export default memo(ContentRow);
