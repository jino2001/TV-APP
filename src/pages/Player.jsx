import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChannelNumberOverlay from "../components/ChannelNumberOverlay.jsx";
import FocusableButton from "../components/FocusableButton.jsx";
import { getContentColors, isPlayableItem } from "../data/content.js";
import {
  getChannelById,
  getChannelByNumber,
  getNextChannel,
  getPreviousChannel,
} from "../utils/channelUtils.js";
import {
  CHANNEL_SWITCH_THROTTLE_MS,
  getRemoteKey,
  handledRemoteActions,
  REMOTE_THROTTLE_MS,
} from "../utils/remoteKeys.js";

const STREAM_ERROR_MESSAGE =
  "Stream could not be loaded. Try another channel or refresh the stream URL.";
const MISSING_STREAM_MESSAGE = "Stream URL is missing.";

function supportsNativeHls(videoElement) {
  return (
    videoElement.canPlayType("application/vnd.apple.mpegurl") ||
    videoElement.canPlayType("application/x-mpegURL")
  );
}

function formatClock(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function clearPlayerFocus() {
  document
    .querySelectorAll("[data-player-action].is-focused")
    .forEach((element) => element.classList.remove("is-focused"));
}

function focusPlayerAction() {
  const action = document.querySelector("[data-player-action]");
  action?.focus({ preventScroll: true });
  action?.classList.add("is-focused");
}

export default function Player({ contentId, contentItems, onBack, onSwitchChannel }) {
  const content = useMemo(
    () => getChannelById(contentId, contentItems),
    [contentId, contentItems],
  );
  const videoRef = useRef(null);
  const lastRemoteEventAtRef = useRef(0);
  const lastChannelSwitchAtRef = useRef(0);
  const [playbackState, setPlaybackState] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => formatClock(new Date()));
  const [numberOverlay, setNumberOverlay] = useState({
    visible: false,
    digit: "",
    channel: null,
    message: "",
  });
  const colors = getContentColors(content);
  const streamUrl = content?.streamUrl ?? "";
  const canPlay = Boolean(content && isPlayableItem(content) && streamUrl);

  const showOverlay = useCallback(() => {
    setOverlayVisible(true);
  }, []);

  const showNumberOverlay = useCallback((digit, channel) => {
    setNumberOverlay({
      visible: true,
      digit,
      channel,
      message: channel ? "" : "Channel not found",
    });
  }, []);

  const switchToChannel = useCallback(
    (channel) => {
      if (!channel || channel.id === contentId) {
        return;
      }

      const now = performance.now();

      if (now - lastChannelSwitchAtRef.current < CHANNEL_SWITCH_THROTTLE_MS) {
        return;
      }

      lastChannelSwitchAtRef.current = now;
      clearPlayerFocus();
      setPlaybackState("loading");
      setErrorMessage("");
      setOverlayVisible(true);
      onSwitchChannel(channel.id);
    },
    [contentId, onSwitchChannel],
  );

  const retryStream = useCallback(() => {
    clearPlayerFocus();
    setErrorMessage("");
    setPlaybackState("loading");
    setRetryKey((currentKey) => currentKey + 1);
    showOverlay();
  }, [showOverlay]);

  const togglePlayback = useCallback(async () => {
    const video = videoRef.current;

    if (!canPlay || !video || playbackState === "error") {
      return;
    }

    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch {
      setPlaybackState("error");
      setErrorMessage(STREAM_ERROR_MESSAGE);
      showOverlay();
    }
  }, [canPlay, playbackState, showOverlay]);

  useEffect(() => {
    setOverlayVisible(true);
    setErrorMessage("");
    setPlaybackState(canPlay ? "loading" : "error");
  }, [canPlay, contentId]);

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
    const intervalId = window.setInterval(() => {
      setCurrentTime(formatClock(new Date()));
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!overlayVisible || playbackState !== "playing") {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setOverlayVisible(false);
      clearPlayerFocus();
    }, 3000);

    return () => window.clearTimeout(timerId);
  }, [overlayVisible, playbackState]);

  useEffect(() => {
    const video = videoRef.current;

    if (!content) {
      setPlaybackState("error");
      setErrorMessage("Channel not found.");
      return undefined;
    }

    if (!streamUrl) {
      setPlaybackState("error");
      setErrorMessage(MISSING_STREAM_MESSAGE);
      return undefined;
    }

    if (!canPlay || !video) {
      setPlaybackState("error");
      setErrorMessage(STREAM_ERROR_MESSAGE);
      return undefined;
    }

    let hls;
    let cancelled = false;
    const nativeHlsSupported = Boolean(supportsNativeHls(video));

    async function playVideo() {
      if (cancelled) {
        return;
      }

      try {
        await video.play();
      } catch {
        if (!cancelled) {
          setPlaybackState("paused");
          showOverlay();
        }
      }
    }

    function handleWaiting() {
      if (!cancelled) {
        setPlaybackState("loading");
      }
    }

    function handlePlaying() {
      if (!cancelled) {
        setPlaybackState("playing");
        setErrorMessage("");
      }
    }

    function handlePause() {
      if (!cancelled && !video.ended) {
        setPlaybackState("paused");
        showOverlay();
      }
    }

    function handleStreamError() {
      if (!cancelled) {
        setPlaybackState("error");
        setErrorMessage(STREAM_ERROR_MESSAGE);
        showOverlay();
      }
    }

    async function setupHlsJs() {
      try {
        const { default: Hls } = await import("hls.js");

        if (cancelled) {
          return;
        }

        if (!Hls.isSupported()) {
          handleStreamError();
          return;
        }

        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          playVideo();
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            handleStreamError();
          }
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);
      } catch {
        handleStreamError();
      }
    }

    setPlaybackState("loading");
    setErrorMessage("");
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("pause", handlePause);
    video.addEventListener("error", handleStreamError);

    if (nativeHlsSupported) {
      video.src = streamUrl;
      video.load();
      video.addEventListener("loadedmetadata", playVideo, { once: true });
    } else {
      setupHlsJs();
    }

    return () => {
      cancelled = true;
      hls?.destroy();
      video.removeEventListener("loadedmetadata", playVideo);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("error", handleStreamError);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [canPlay, content, retryKey, showOverlay, streamUrl]);

  useEffect(() => {
    function handleRemoteKey(event) {
      const remoteKey = getRemoteKey(event);

      if (!remoteKey || !handledRemoteActions.has(remoteKey.action)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const now = performance.now();

      if (now - lastRemoteEventAtRef.current < REMOTE_THROTTLE_MS) {
        return;
      }

      lastRemoteEventAtRef.current = now;
      showOverlay();

      if (remoteKey.action === "BACK") {
        onBack();
        return;
      }

      if (remoteKey.action === "NUMBER") {
        const channel = getChannelByNumber(remoteKey.digit, contentItems);
        showNumberOverlay(remoteKey.digit, channel);
        switchToChannel(channel);
        return;
      }

      if (remoteKey.action === "UP" || remoteKey.action === "CHANNEL_DOWN") {
        switchToChannel(getPreviousChannel(contentId, contentItems));
        return;
      }

      if (remoteKey.action === "DOWN" || remoteKey.action === "CHANNEL_UP") {
        switchToChannel(getNextChannel(contentId, contentItems));
        return;
      }

      if (remoteKey.action === "LEFT" || remoteKey.action === "RIGHT") {
        focusPlayerAction();
        return;
      }

      if (remoteKey.action === "ENTER" || remoteKey.action === "SPACE") {
        const focusedAction =
          document.activeElement?.closest?.("[data-player-action]");

        if (focusedAction) {
          focusedAction.click();
          return;
        }

        togglePlayback();
      }
    }

    window.addEventListener("keydown", handleRemoteKey, true);

    return () => {
      window.removeEventListener("keydown", handleRemoteKey, true);
    };
  }, [
    contentId,
    contentItems,
    onBack,
    showNumberOverlay,
    showOverlay,
    switchToChannel,
    togglePlayback,
  ]);

  const title = content?.title ?? "Channel unavailable";
  const showChrome = overlayVisible || playbackState !== "playing";
  const showLoading = canPlay && playbackState === "loading";
  const showError = !content || playbackState === "error";

  return (
    <div
      className="player-page"
      style={{
        "--poster-start": colors[0],
        "--poster-mid": colors[1],
        "--poster-end": colors[2],
      }}
    >
      <section className="player-stage player-stage--tv" aria-label={title}>
        <video
          ref={videoRef}
          className="player-video"
          poster={content?.image || undefined}
          playsInline
          preload="auto"
        />

        {showLoading && (
          <div className="player-state player-state--loading" role="status">
            <span className="loading-ring" />
            <strong>Loading channel {content?.channelNumber}</strong>
            <p>{title}</p>
          </div>
        )}

        {showError && (
          <div className="player-state player-state--error" role="alert">
            <strong>Stream not available</strong>
            <p>{errorMessage || STREAM_ERROR_MESSAGE}</p>
          </div>
        )}

        {showChrome && (
          <div className="player-tv-overlay">
            <div className="player-tv-top">
              <div>
                <span className="live-pill">LIVE</span>
                <h1>
                  {content?.channelNumber && (
                    <span className="player-channel-number">
                      {content.channelNumber}
                    </span>
                  )}
                  {title}
                </h1>
              </div>
              <strong>{currentTime}</strong>
            </div>

            <div className="player-actions">
              <FocusableButton
                variant="ghost"
                data-player-action="true"
                onClick={onBack}
              >
                Back
              </FocusableButton>
              <FocusableButton
                variant="secondary"
                data-player-action="true"
                onClick={retryStream}
              >
                Retry
              </FocusableButton>
            </div>

            <div className="player-hints" aria-hidden="true">
              <span>1-5: Channel</span>
              <span>Up / Down: Switch</span>
              <span>Enter / Space: Play/Pause</span>
              <span>Back: Home</span>
            </div>
          </div>
        )}

        <ChannelNumberOverlay
          channel={numberOverlay.channel}
          digit={numberOverlay.digit}
          message={numberOverlay.message}
          visible={numberOverlay.visible}
        />
      </section>
    </div>
  );
}
