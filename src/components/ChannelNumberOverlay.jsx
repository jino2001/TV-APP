import { memo } from "react";

function ChannelNumberOverlay({ channel, digit, message, visible }) {
  if (!visible) {
    return null;
  }

  return (
    <div className="channel-number-overlay" aria-live="polite">
      <strong>{digit}</strong>
      <span>{channel?.title ?? message ?? "არ მოიძებნა"}</span>
    </div>
  );
}

export default memo(ChannelNumberOverlay);
