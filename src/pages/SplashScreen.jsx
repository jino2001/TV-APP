export default function SplashScreen() {
  return (
    <main className="splash-screen" aria-label="Loading Personal TV">
      <div className="splash-logo-wrap" aria-hidden="true">
        <img
          className="splash-logo"
          src="/personal-tv-logo.svg"
          alt=""
          decoding="async"
        />
        <span className="splash-scanline" />
      </div>
    </main>
  );
}
