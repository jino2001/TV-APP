export default function Header({ onHome }) {
  return (
    <header className="app-header app-header--minimal">
      <button
        type="button"
        data-tv-focusable="true"
        className="brand-button"
        onClick={onHome}
        aria-label="Go home"
      >
        <span className="brand-mark brand-mark--logo">
          <img src="/personal-tv-icon.svg" alt="" />
        </span>
        <span className="brand-copy">
          <strong>Personal TV</strong>
        </span>
      </button>
    </header>
  );
}
