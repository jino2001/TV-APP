import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChannelNumberOverlay from "../components/ChannelNumberOverlay.jsx";
import { isPlayableItem } from "../data/content.js";
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

const MAX_CHANNEL_DIGITS = 2;
const NUMERIC_CHANNEL_BUFFER_MS = 1100;
const OVERLAY_AUTO_HIDE_MS = 2500;
const RECOVERY_FAILURE_MS = 12000;
const WATCHDOG_INTERVAL_MS = 5000;
const WATCHDOG_STALL_MS = 12000;
const HEARTBEAT_INTERVAL_MS = 30000;
const SOFT_RECOVERY_THROTTLE_MS = 4000;

function supportsNativeHls(videoElement) {
  return (
    videoElement.canPlayType("application/vnd.apple.mpegurl") ||
    videoElement.canPlayType("application/x-mpegURL")
  );
}

function clearPlayerFocus() {
  document
    .querySelectorAll("[data-player-action].is-focused")
    .forEach((element) => element.classList.remove("is-focused"));
}

export default function Player({
  contentId,
  contentItems,
  onBack,
  onSwitchChannel,
}) {
  const content = useMemo(
    () => getChannelById(contentId, contentItems),
    [contentId, contentItems],
  );
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const reloadButtonRef = useRef(null);
  const lastRemoteEventAtRef = useRef(0);
  const lastChannelSwitchAtRef = useRef(0);
  const numericBufferRef = useRef("");
  const numericBufferTimerRef = useRef(null);
  const waitingTimerRef = useRef(null);
  const watchdogTimerRef = useRef(null);
  const playbackStateRef = useRef("loading");
  const lastProgressRef = useRef({ at: performance.now(), time: 0 });
  const lastRecoveryAttemptAtRef = useRef(0);
  const userPausedRef = useRef(false);
  const [playbackState, setPlaybackState] = useState("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [numberOverlay, setNumberOverlay] = useState({
    visible: false,
    digit: "",
    channel: null,
    message: "",
  });
  const streamUrl = content?.streamUrl ?? "";
  const canPlay = Boolean(content && isPlayableItem(content) && streamUrl);
  const isReloadVisible = playbackState === "failed";

  const showOverlay = useCallback(() => {
    if (playbackStateRef.current !== "failed") {
      setOverlayVisible(true);
    }
  }, []);

  const clearNumericBufferTimer = useCallback(() => {
    if (numericBufferTimerRef.current) {
      window.clearTimeout(numericBufferTimerRef.current);
      numericBufferTimerRef.current = null;
    }
  }, []);

  const clearStreamTimers = useCallback(() => {
    if (waitingTimerRef.current) {
      window.clearTimeout(waitingTimerRef.current);
      waitingTimerRef.current = null;
    }

    if (watchdogTimerRef.current) {
      window.clearInterval(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  }, []);

  const showReloadOverlay = useCallback(
    (reason) => {
      clearStreamTimers();
      clearPlayerFocus();

      if (import.meta.env.DEV && reason) {
        console.warn("Live stream needs reload:", reason);
      }

      setPlaybackState("failed");
      setOverlayVisible(false);
    },
    [clearStreamTimers],
  );

  const showNumberOverlay = useCallback((digits, channel) => {
    setNumberOverlay({
      visible: true,
      digit: digits,
      channel,
      message: channel ? "" : "არ მოიძებნა",
    });
  }, []);

  const hasLongerChannelNumber = useCallback(
    (digits) =>
      contentItems.some((channel) => {
        const channelNumber = String(channel.channelNumber ?? "");
        return (
          channelNumber.startsWith(digits) &&
          channelNumber.length > digits.length
        );
      }),
    [contentItems],
  );

  const switchToChannel = useCallback(
    (channel, options = {}) => {
      if (!channel || channel.id === contentId) {
        return;
      }

      const now = performance.now();

      if (
        !options.force &&
        now - lastChannelSwitchAtRef.current < CHANNEL_SWITCH_THROTTLE_MS
      ) {
        return;
      }

      lastChannelSwitchAtRef.current = now;
      userPausedRef.current = false;
      clearPlayerFocus();
      clearStreamTimers();
      setPlaybackState("loading");
      setOverlayVisible(true);
      onSwitchChannel(channel.id);
    },
    [clearStreamTimers, contentId, onSwitchChannel],
  );

  const tuneBufferedChannel = useCallback(() => {
    const digits = numericBufferRef.current;

    if (!digits) {
      return;
    }

    clearNumericBufferTimer();
    numericBufferRef.current = "";

    const channel = getChannelByNumber(digits, contentItems);
    showNumberOverlay(digits, channel);
    switchToChannel(channel, { force: true });
  }, [
    clearNumericBufferTimer,
    contentItems,
    showNumberOverlay,
    switchToChannel,
  ]);

  const queueNumericChannel = useCallback(
    (digit) => {
      clearNumericBufferTimer();

      const nextDigits = `${numericBufferRef.current}${digit}`.slice(
        0,
        MAX_CHANNEL_DIGITS,
      );
      numericBufferRef.current = nextDigits;

      const channel = getChannelByNumber(nextDigits, contentItems);
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
      clearNumericBufferTimer,
      contentItems,
      hasLongerChannelNumber,
      showNumberOverlay,
      tuneBufferedChannel,
    ],
  );

  const reloadCurrentStream = useCallback(() => {
    const video = videoRef.current;

    clearPlayerFocus();
    clearStreamTimers();
    hlsRef.current?.destroy();
    hlsRef.current = null;

    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }

    userPausedRef.current = false;
    setOverlayVisible(true);
    setPlaybackState("loading");
    setReloadKey((currentKey) => currentKey + 1);
  }, [clearStreamTimers]);

  const togglePlayback = useCallback(async () => {
    const video = videoRef.current;

    if (!canPlay || !video || playbackStateRef.current === "failed") {
      return;
    }

    try {
      if (video.paused) {
        userPausedRef.current = false;
        await video.play();
      } else {
        userPausedRef.current = true;
        video.pause();
      }
    } catch (error) {
      showReloadOverlay(error?.message ?? "playback");
    }
  }, [canPlay, showReloadOverlay]);

  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);

  useEffect(() => {
    setOverlayVisible(true);
    setPlaybackState(canPlay ? "loading" : "failed");
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
    }, 900);

    return () => window.clearTimeout(timerId);
  }, [numberOverlay.visible]);

  useEffect(() => {
    if (!overlayVisible || playbackState !== "playing") {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setOverlayVisible(false);
      clearPlayerFocus();
    }, OVERLAY_AUTO_HIDE_MS);

    return () => window.clearTimeout(timerId);
  }, [overlayVisible, playbackState]);

  useEffect(() => {
    if (!isReloadVisible) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      reloadButtonRef.current?.focus({ preventScroll: true });
      reloadButtonRef.current?.classList.add("is-focused");
    }, 30);

    return () => window.clearTimeout(timerId);
  }, [isReloadVisible]);

  useEffect(() => {
    let wakeLock = null;
    let cancelled = false;

    async function requestWakeLock() {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible") {
        return;
      }

      try {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener?.("release", () => {
          wakeLock = null;
        });
      } catch {
        wakeLock = null;
      }
    }

    function handleVisibilityChange() {
      if (!cancelled && document.visibilityState === "visible" && !wakeLock) {
        requestWakeLock();
      }
    }

    requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      const releasePromise = wakeLock?.release?.();
      releasePromise?.catch?.(() => {});
      wakeLock = null;
    };
  }, []);

  useEffect(() => {
    if (!canPlay) {
      return undefined;
    }

    const heartbeatId = window.setInterval(() => {
      const video = videoRef.current;

      if (
        !video ||
        userPausedRef.current ||
        playbackStateRef.current === "failed" ||
        playbackStateRef.current === "loading" ||
        video.ended ||
        video.seeking
      ) {
        return;
      }

      if (video.paused) {
        video.play().catch(() => {});
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => window.clearInterval(heartbeatId);
  }, [canPlay, contentId, reloadKey]);

  useEffect(() => {
    const video = videoRef.current;

    if (!content || !streamUrl || !canPlay || !video) {
      showReloadOverlay("missing stream");
      return undefined;
    }

    let cancelled = false;
    const nativeHlsSupported = Boolean(supportsNativeHls(video));

    function resetProgressTracker() {
      lastProgressRef.current = {
        at: performance.now(),
        time: video.currentTime,
      };
    }

    function startWatchdog() {
      if (watchdogTimerRef.current) {
        window.clearInterval(watchdogTimerRef.current);
      }

      resetProgressTracker();
      watchdogTimerRef.current = window.setInterval(() => {
        if (
          cancelled ||
          video.paused ||
          video.ended ||
          video.seeking ||
          playbackStateRef.current !== "playing"
        ) {
          resetProgressTracker();
          return;
        }

        const currentTime = video.currentTime;
        const lastProgress = lastProgressRef.current;

        if (Math.abs(currentTime - lastProgress.time) > 0.25) {
          lastProgressRef.current = {
            at: performance.now(),
            time: currentTime,
          };
          return;
        }

        if (performance.now() - lastProgress.at >= WATCHDOG_STALL_MS) {
          showReloadOverlay("watchdog");
        }
      }, WATCHDOG_INTERVAL_MS);
    }

    function scheduleRecoveryFailure(reason) {
      if (waitingTimerRef.current) {
        window.clearTimeout(waitingTimerRef.current);
      }

      waitingTimerRef.current = window.setTimeout(() => {
        showReloadOverlay(reason);
      }, RECOVERY_FAILURE_MS);
    }

    async function attemptSoftRecovery(reason) {
      if (cancelled) {
        return;
      }

      setPlaybackState("loading");
      scheduleRecoveryFailure(reason);

      if (userPausedRef.current) {
        return;
      }

      const now = performance.now();

      if (now - lastRecoveryAttemptAtRef.current < SOFT_RECOVERY_THROTTLE_MS) {
        return;
      }

      lastRecoveryAttemptAtRef.current = now;

      try {
        await video.play();
      } catch {
        // The recovery timer will show the single reload button if playback does not resume.
      }
    }

    async function playVideo() {
      if (cancelled) {
        return;
      }

      try {
        userPausedRef.current = false;
        await video.play();
      } catch (error) {
        if (!cancelled) {
          showReloadOverlay(error?.message ?? "play");
        }
      }
    }

    function handleWaiting() {
      if (cancelled) {
        return;
      }

      attemptSoftRecovery("waiting");
    }

    function handlePlaying() {
      if (cancelled) {
        return;
      }

      if (waitingTimerRef.current) {
        window.clearTimeout(waitingTimerRef.current);
        waitingTimerRef.current = null;
      }

      setPlaybackState("playing");
      setOverlayVisible(true);
      userPausedRef.current = false;
      startWatchdog();
    }

    function handlePause() {
      if (!cancelled && !video.ended) {
        if (watchdogTimerRef.current) {
          window.clearInterval(watchdogTimerRef.current);
          watchdogTimerRef.current = null;
        }
        setPlaybackState("paused");
        showOverlay();
      }
    }

    function handleRecoverableProblem(event) {
      if (!cancelled) {
        attemptSoftRecovery(event?.type ?? "stalled");
      }
    }

    function handleFatalProblem(event) {
      if (!cancelled) {
        showReloadOverlay(event?.type ?? "stream");
      }
    }

    async function setupHlsJs() {
      try {
        const { default: Hls } = await import("hls.js");

        if (cancelled) {
          return;
        }

        if (!Hls.isSupported()) {
          showReloadOverlay("hls unsupported");
          return;
        }

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });

        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          playVideo();
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            showReloadOverlay(data.type ?? "hls");
          }
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);
      } catch (error) {
        showReloadOverlay(error?.message ?? "hls");
      }
    }

    clearStreamTimers();
    hlsRef.current?.destroy();
    hlsRef.current = null;
    setPlaybackState("loading");
    setOverlayVisible(true);
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("pause", handlePause);
    video.addEventListener("stalled", handleRecoverableProblem);
    video.addEventListener("suspend", handleRecoverableProblem);
    video.addEventListener("ended", handleFatalProblem);
    video.addEventListener("error", handleFatalProblem);

    if (nativeHlsSupported) {
      video.src = streamUrl;
      video.load();
      video.addEventListener("loadedmetadata", playVideo, { once: true });
    } else {
      setupHlsJs();
    }

    return () => {
      cancelled = true;
      clearStreamTimers();
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeEventListener("loadedmetadata", playVideo);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("stalled", handleRecoverableProblem);
      video.removeEventListener("suspend", handleRecoverableProblem);
      video.removeEventListener("ended", handleFatalProblem);
      video.removeEventListener("error", handleFatalProblem);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [
    canPlay,
    clearStreamTimers,
    content,
    reloadKey,
    showOverlay,
    showReloadOverlay,
    streamUrl,
  ]);

  useEffect(() => {
    numericBufferRef.current = "";
    clearNumericBufferTimer();
  }, [clearNumericBufferTimer, contentId]);

  useEffect(() => {
    return () => {
      clearNumericBufferTimer();
      clearStreamTimers();
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [clearNumericBufferTimer, clearStreamTimers]);

  useEffect(() => {
    function handleRemoteKey(event) {
      const remoteKey = getRemoteKey(event);

      if (!remoteKey || !handledRemoteActions.has(remoteKey.action)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const hasBufferedNumber = Boolean(numericBufferRef.current);

      if (remoteKey.action === "NUMBER") {
        showOverlay();
        queueNumericChannel(remoteKey.digit);
        return;
      }

      if (remoteKey.action === "ENTER" && hasBufferedNumber) {
        showOverlay();
        tuneBufferedChannel();
        return;
      }

      if (hasBufferedNumber) {
        numericBufferRef.current = "";
        clearNumericBufferTimer();
      }

      if (remoteKey.action === "BACK") {
        onBack();
        return;
      }

      if (
        playbackStateRef.current === "failed" &&
        (remoteKey.action === "ENTER" || remoteKey.action === "SPACE")
      ) {
        reloadCurrentStream();
        return;
      }

      const now = performance.now();

      if (now - lastRemoteEventAtRef.current < REMOTE_THROTTLE_MS) {
        return;
      }

      lastRemoteEventAtRef.current = now;
      showOverlay();

      if (remoteKey.action === "DOWN" || remoteKey.action === "CHANNEL_UP") {
        switchToChannel(getNextChannel(contentId, contentItems));
        return;
      }

      if (remoteKey.action === "UP" || remoteKey.action === "CHANNEL_DOWN") {
        switchToChannel(getPreviousChannel(contentId, contentItems));
        return;
      }

      if (remoteKey.action === "ENTER" || remoteKey.action === "SPACE") {
        togglePlayback();
      }
    }

    window.addEventListener("keydown", handleRemoteKey, true);

    return () => {
      window.removeEventListener("keydown", handleRemoteKey, true);
    };
  }, [
    clearNumericBufferTimer,
    contentId,
    contentItems,
    onBack,
    queueNumericChannel,
    reloadCurrentStream,
    showOverlay,
    switchToChannel,
    togglePlayback,
    tuneBufferedChannel,
  ]);

  const title = content?.title ?? "";
  const showChrome = overlayVisible && !isReloadVisible && content;

  return (
    <div className="player-page">
      <section className="player-stage player-stage--tv" aria-label={title}>
        <video
          ref={videoRef}
          className="player-video"
          autoPlay
          controls={false}
          playsInline
          preload="auto"
        />

        {showChrome && (
          <div className="player-tv-overlay player-tv-overlay--minimal">
            <div className="player-tv-top">
              <span className="live-pill">LIVE</span>
              <h1>
                {content.channelNumber && (
                  <span className="player-channel-number">
                    {content.channelNumber}
                  </span>
                )}
                {title}
              </h1>
            </div>
          </div>
        )}

        {isReloadVisible && (
          <div className="player-reload-overlay">
            <button
              ref={reloadButtonRef}
              type="button"
              data-player-action="true"
              className="player-reload-button"
              onClick={reloadCurrentStream}
            >
              გადატვირთვა
            </button>
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
