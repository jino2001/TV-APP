import { useCallback, useEffect, useMemo, useState } from "react";
import ChannelNumberOverlay from "./components/ChannelNumberOverlay.jsx";
import Header from "./components/Header.jsx";
import Home from "./pages/Home.jsx";
import Player from "./pages/Player.jsx";
import SplashScreen from "./pages/SplashScreen.jsx";
import { TV_PERFORMANCE_MODE } from "./config/performance.js";
import { contentItems } from "./data/content.js";
import { useSpatialNavigation } from "./hooks/useSpatialNavigation.js";
import { getActiveChannels, getChannelByNumber } from "./utils/channelUtils.js";
import { getRemoteKey, handledRemoteActions } from "./utils/remoteKeys.js";

export default function App() {
  const [screen, setScreen] = useState({ page: "home", contentId: null });
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [numberOverlay, setNumberOverlay] = useState({
    visible: false,
    digit: "",
    channel: null,
    message: "",
  });
  const isPlayerScreen = screen.page === "player";
  const channels = useMemo(() => getActiveChannels(contentItems), []);

  const goHome = useCallback(() => {
    setScreen({ page: "home", contentId: null });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const playChannel = useCallback(
    (contentId) => {
      if (!channels.some((channel) => channel.id === contentId)) {
        return;
      }

      setScreen({ page: "player", contentId });
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    },
    [channels],
  );

  const showNumberOverlay = useCallback((digit, channel) => {
    setNumberOverlay({
      visible: true,
      digit,
      channel,
      message: channel ? "" : "Channel not found",
    });
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsSplashVisible(false);
    }, 900);

    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    if (!numberOverlay.visible) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setNumberOverlay((currentOverlay) => ({
        ...currentOverlay,
        visible: false,
      }));
    }, 1500);

    return () => window.clearTimeout(timerId);
  }, [numberOverlay.visible]);

  useEffect(() => {
    if (isSplashVisible || isPlayerScreen) {
      return undefined;
    }

    function handleNumericKey(event) {
      const remoteKey = getRemoteKey(event);

      if (!remoteKey || !handledRemoteActions.has(remoteKey.action)) {
        return;
      }

      if (remoteKey.action !== "NUMBER") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const channel = getChannelByNumber(remoteKey.digit, channels);
      showNumberOverlay(remoteKey.digit, channel);

      if (channel) {
        playChannel(channel.id);
      }
    }

    window.addEventListener("keydown", handleNumericKey, true);

    return () => {
      window.removeEventListener("keydown", handleNumericKey, true);
    };
  }, [
    channels,
    isPlayerScreen,
    isSplashVisible,
    playChannel,
    showNumberOverlay,
  ]);

  useSpatialNavigation(
    goHome,
    `${screen.page}-${screen.contentId ?? "home"}`,
    !isPlayerScreen && !isSplashVisible,
  );

  if (isSplashVisible) {
    return (
      <div
        className={`tv-app tv-app--splash ${
          TV_PERFORMANCE_MODE ? "tv-app--performance" : ""
        }`}
      >
        <SplashScreen />
      </div>
    );
  }

  return (
    <div
      className={`tv-app ${isPlayerScreen ? "tv-app--player" : ""} ${
        TV_PERFORMANCE_MODE ? "tv-app--performance" : ""
      }`}
    >
      {!isPlayerScreen && <Header currentPage={screen.page} onHome={goHome} />}

      <main className={`tv-main ${isPlayerScreen ? "tv-main--player" : ""}`}>
        {screen.page === "home" && (
          <Home contentItems={channels} onPlay={playChannel} />
        )}

        {screen.page === "player" && (
          <Player
            contentId={screen.contentId}
            contentItems={channels}
            onBack={goHome}
            onSwitchChannel={playChannel}
          />
        )}
      </main>

      {!isPlayerScreen && (
        <ChannelNumberOverlay
          channel={numberOverlay.channel}
          digit={numberOverlay.digit}
          message={numberOverlay.message}
          visible={numberOverlay.visible}
        />
      )}
    </div>
  );
}
