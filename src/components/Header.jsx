import FocusableButton from "./FocusableButton.jsx";

export default function Header({ currentPage, onHome }) {
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
          <small>{currentPage === "player" ? "Now Playing" : "Private Library"}</small>
        </span>
      </button>

      <nav className="header-actions" aria-label="Main">
        <FocusableButton variant="ghost" onClick={onHome}>
          Home
        </FocusableButton>
      </nav>
    </header>
  );
}
