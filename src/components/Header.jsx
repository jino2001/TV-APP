import { useEffect, useState } from "react";
import FocusableButton from "./FocusableButton.jsx";

function formatClock(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export default function Header({ currentPage, onHome, onSettings }) {
  const [currentTime, setCurrentTime] = useState(() => formatClock(new Date()));

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(formatClock(new Date()));
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <header className="app-header">
      <button
        type="button"
        data-tv-focusable="true"
        className="brand-button"
        onClick={onHome}
        aria-label="Go home"
      >
        <span className="brand-mark">TV</span>
        <span className="brand-copy">
          <strong>Personal TV</strong>
          <small>{currentPage === "settings" ? "Settings" : "Live TV"}</small>
        </span>
      </button>

      <div className="header-status" aria-label="App status">
        <span>Live TV</span>
        <strong>{currentTime}</strong>
      </div>

      <nav className="header-actions" aria-label="Main">
        <FocusableButton variant="ghost" onClick={onHome}>
          Home
        </FocusableButton>
        {onSettings && (
          <FocusableButton variant="ghost" onClick={onSettings}>
            Settings
          </FocusableButton>
        )}
      </nav>
    </header>
  );
}
