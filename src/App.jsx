import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChannelNumberOverlay from "./components/ChannelNumberOverlay.jsx";
import Header from "./components/Header.jsx";
import Home from "./pages/Home.jsx";
import Player from "./pages/Player.jsx";
import SplashScreen from "./pages/SplashScreen.jsx";
import { TV_PERFORMANCE_MODE } from "./config/performance.js";
import { contentItems } from "./data/content.js";
import { useSpatialNavigation } from "./hooks/useSpatialNavigation.js";
import { saveLastChannelId } from "./utils/storage.js";
import { getActiveChannels, getChannelByNumber } from "./utils/channelUtils.js";
import { getRemoteKey, handledRemoteActions } from "./utils/remoteKeys.js";

const MAX_CHANNEL_DIGITS = 2;
const NUMERIC_CHANNEL_BUFFER_MS = 1100;

export default function App() {
  const [screen, setScreen] = useState({ page: "home", contentId: null });
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [numberOverlay, setNumberOverlay] = useState({
    visible: false,
    digit: "",
    channel: null,
    message: "",
  });
  const numericBufferRef = useRef("");
  const numericBufferTimerRef = useRef(null);
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
      saveLastChannelId(contentId);
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    },
    [channels],
  );

  const showNumberOverlay = useCallback((digits, channel) => {
    setNumberOverlay({
      visible: true,
      digit: digits,
      channel,
      message: channel ? "" : "არ მოიძებნა",
    });
  }, []);

  const clearNumericBufferTimer = useCallback(() => {
    if (numericBufferTimerRef.current) {
      window.clearTimeout(numericBufferTimerRef.current);
      numericBufferTimerRef.current = null;
    }
  }, []);

  const hasLongerChannelNumber = useCallback(
    (digits) =>
      channels.some((channel) => {
        const channelNumber = String(channel.channelNumber ?? "");
        return (
          channelNumber.startsWith(digits) &&
          channelNumber.length > digits.length
        );
      }),
    [channels],
  );

  const tuneBufferedChannel = useCallback(() => {
    const digits = numericBufferRef.current;

    if (!digits) {
      return;
    }

    clearNumericBufferTimer();
    numericBufferRef.current = "";

    const channel = getChannelByNumber(digits, channels);
    showNumberOverlay(digits, channel);

    if (channel) {
      playChannel(channel.id);
    }
  }, [channels, clearNumericBufferTimer, playChannel, showNumberOverlay]);

  const queueNumericChannel = useCallback(
    (digit) => {
      clearNumericBufferTimer();

      const nextDigits = `${numericBufferRef.current}${digit}`.slice(
        0,
        MAX_CHANNEL_DIGITS,
      );
      numericBufferRef.current = nextDigits;

      const channel = getChannelByNumber(nextDigits, channels);
      showNumberOverlay(nextDigits, channel);

      if (
        nextDigits.length >= MAX_CHANNEL_DIGITS ||
        !hasLongerChannelNumber(nextDigits)
      ) {
        tuneBufferedChannel();
        return;
      }

      numericBufferTimerRef.current = window.setTimeout(
        tuneBufferedChannel,
        NUMERIC_CHANNEL_BUFFER_MS,
      );
    },
    [
      channels,
      clearNumericBufferTimer,
      hasLongerChannelNumber,
      showNumberOverlay,
      tuneBufferedChannel,
    ],
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsSplashVisible(false);
    }, 1700);

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
    }, 900);

    return () => window.clearTimeout(timerId);
  }, [numberOverlay.visible]);

  useEffect(() => {
    return () => clearNumericBufferTimer();
  }, [clearNumericBufferTimer]);

  useEffect(() => {
    if (isSplashVisible || isPlayerScreen) {
      numericBufferRef.current = "";
      clearNumericBufferTimer();
    }
  }, [clearNumericBufferTimer, isPlayerScreen, isSplashVisible]);

  useEffect(() => {
    if (isSplashVisible || isPlayerScreen) {
      return undefined;
    }

    function handleNumericKey(event) {
      const remoteKey = getRemoteKey(event);

      if (!remoteKey || !handledRemoteActions.has(remoteKey.action)) {
        return;
      }

      const hasBufferedNumber = Boolean(numericBufferRef.current);

      if (
        remoteKey.action !== "NUMBER" &&
        !(remoteKey.action === "ENTER" && hasBufferedNumber)
      ) {
        if (hasBufferedNumber) {
          numericBufferRef.current = "";
          clearNumericBufferTimer();
        }

        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (remoteKey.action === "NUMBER") {
        queueNumericChannel(remoteKey.digit);
        return;
      }

      tuneBufferedChannel();
    }

    window.addEventListener("keydown", handleNumericKey, true);

    return () => {
      window.removeEventListener("keydown", handleNumericKey, true);
    };
  }, [
    clearNumericBufferTimer,
    isPlayerScreen,
    isSplashVisible,
    queueNumericChannel,
    tuneBufferedChannel,
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
