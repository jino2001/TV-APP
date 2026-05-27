import FocusableButton from "../components/FocusableButton.jsx";

export default function Settings({
  settings,
  onBack,
  onClearFavorites,
  onClearRecentlyWatched,
  onUpdateSetting,
}) {
  return (
    <div className="settings-page">
      <section className="settings-panel" aria-labelledby="settings-title">
        <div className="settings-heading">
          <span className="eyebrow">Android TV</span>
          <h1 id="settings-title">Settings</h1>
        </div>

        <div className="settings-list">
          <div className="settings-item">
            <div>
              <strong>Autoplay last channel</strong>
              <span>Start playback after the splash screen.</span>
            </div>
            <FocusableButton
              variant={settings.autoplayLastChannel ? "primary" : "secondary"}
              onClick={() =>
                onUpdateSetting(
                  "autoplayLastChannel",
                  !settings.autoplayLastChannel,
                )
              }
            >
              {settings.autoplayLastChannel ? "On" : "Off"}
            </FocusableButton>
          </div>

          <div className="settings-item">
            <div>
              <strong>Show recently watched</strong>
              <span>Show or hide the recent row on Home.</span>
            </div>
            <FocusableButton
              variant={settings.showRecentlyWatched ? "primary" : "secondary"}
              onClick={() =>
                onUpdateSetting(
                  "showRecentlyWatched",
                  !settings.showRecentlyWatched,
                )
              }
            >
              {settings.showRecentlyWatched ? "On" : "Off"}
            </FocusableButton>
          </div>

          <div className="settings-item">
            <div>
              <strong>Performance mode</strong>
              <span>Reduce effects for smoother TV navigation.</span>
            </div>
            <FocusableButton
              variant={settings.performanceMode ? "primary" : "secondary"}
              onClick={() =>
                onUpdateSetting("performanceMode", !settings.performanceMode)
              }
            >
              {settings.performanceMode ? "On" : "Off"}
            </FocusableButton>
          </div>

          <div className="settings-actions">
            <FocusableButton variant="secondary" onClick={onClearFavorites}>
              Clear Favorites
            </FocusableButton>
            <FocusableButton
              variant="secondary"
              onClick={onClearRecentlyWatched}
            >
              Clear Recent
            </FocusableButton>
            <FocusableButton variant="ghost" onClick={onBack}>
              Back
            </FocusableButton>
          </div>
        </div>
      </section>
    </div>
  );
}
