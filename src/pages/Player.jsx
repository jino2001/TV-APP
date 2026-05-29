import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChannelNumberOverlay from "../components/ChannelNumberOverlay.jsx";
import { getPlaybackType, isPlayableItem } from "../data/content.js";
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
const IFRAME_LOAD_TIMEOUT_MS = 12000;
const IFRAME_BLOCK_CHECK_MS = 250;
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

function getIframeBlockReason(iframeElement) {
  try {
    const frameDocument =
      iframeElement?.contentDocument ?? iframeElement?.contentWindow?.document;
    const frameLocation = frameDocument?.location?.href ?? "";
    const frameTitle = frameDocument?.title ?? "";
    const frameText = frameDocument?.body?.innerText ?? "";
    const visibleText = `${frameLocation} ${frameTitle} ${frameText}`.toLowerCase();

    if (
      visibleText.includes("refused to connect") ||
      visibleText.includes("chrome-error") ||
      visibleText.includes("err_blocked_by_response") ||
      visibleText.includes("x-frame-options") ||
      visibleText.includes("frame-ancestors")
    ) {
      return "iframe blocked";
    }
  } catch {
    return null;
  }

  return null;
}

function isKnownBlockedIframeUrl(streamUrl) {
  try {
    const url = new URL(streamUrl);
    return url.hostname === "www.myvideo.ge" && url.pathname.startsWith("/tv/");
  } catch {
    return false;
  }
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
  const iframeRef = useRef(null);
  const hlsRef = useRef(null);
  const reloadButtonRef = useRef(null);
  const lastRemoteEventAtRef = useRef(0);
  const lastChannelSwitchAtRef = useRef(0);
  const numericBufferRef = useRef("");
  const numericBufferTimerRef = useRef(null);
  const iframeBlockCheckTimerRef = useRef(null);
  const iframeLoadTimerRef = useRef(null);
  const waitingTimerRef = useRef(null);
  const watchdogTimerRef = useRef(null);
  const playbackStateRef = useRef("loading");
  const lastProgressRef = useRef({ at: performance.now(), time: 0 });
  const lastRecoveryAttemptAtRef = useRef(0);
  const userPausedRef = useRef(false);
  const [playbackState, setPlaybackState] = useState("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [iframeReloadKey, setIframeReloadKey] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [numberOverlay, setNumberOverlay] = useState({
    visible: false,
    digit: "",
    channel: null,
    message: "",
  });
  const playbackType = getPlaybackType(content);
  const streamUrl = content?.streamUrl ?? "";
  const canPlay = Boolean(content && isPlayableItem(content) && streamUrl);
  const isHlsPlayback = playbackType === "hls";
  const isIframePlayback = playbackType === "iframe";
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
    if (iframeLoadTimerRef.current) {
      window.clearTimeout(iframeLoadTimerRef.current);
      iframeLoadTimerRef.current = null;
    }

    if (iframeBlockCheckTimerRef.current) {
      window.clearTimeout(iframeBlockCheckTimerRef.current);
      iframeBlockCheckTimerRef.current = null;
    }

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

      playbackStateRef.current = "failed";
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
      hlsRef.current?.destroy();
      hlsRef.current = null;

      const video = videoRef.current;

      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }

      setPlaybackState("loading");
      setOverlayVisible(true);
      onSwitchChannel(channel.id);
    },
    [clearStreamTimers, contentId, onSwitchChannel],
  );

  const switchToNextChannel = useCallback(() => {
    switchToChannel(getNextChannel(contentId, contentItems));
  }, [contentId, contentItems, switchToChannel]);

  const switchToPreviousChannel = useCallback(() => {
    switchToChannel(getPreviousChannel(contentId, contentItems));
  }, [contentId, contentItems, switchToChannel]);

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

    if (isIframePlayback) {
      userPausedRef.current = false;
      playbackStateRef.current = "loading";
      setOverlayVisible(false);
      setPlaybackState("loading");
      setIframeReloadKey((currentKey) => currentKey + 1);
      return;
    }

    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }

    userPausedRef.current = false;
    playbackStateRef.current = "loading";
    setOverlayVisible(true);
    setPlaybackState("loading");
    setReloadKey((currentKey) => currentKey + 1);
  }, [clearStreamTimers, isIframePlayback]);

  const togglePlayback = useCallback(async () => {
    const video = videoRef.current;

    if (
      !isHlsPlayback ||
      !canPlay ||
      !video ||
      playbackStateRef.current === "failed"
    ) {
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
  }, [canPlay, isHlsPlayback, showReloadOverlay]);

  const handleIframeLoad = useCallback(() => {
    if (!isIframePlayback || playbackStateRef.current === "failed") {
      return;
    }

    if (iframeLoadTimerRef.current) {
      window.clearTimeout(iframeLoadTimerRef.current);
      iframeLoadTimerRef.current = null;
    }

    if (iframeBlockCheckTimerRef.current) {
      window.clearTimeout(iframeBlockCheckTimerRef.current);
    }

    iframeBlockCheckTimerRef.current = window.setTimeout(() => {
      iframeBlockCheckTimerRef.current = null;

      if (!isIframePlayback || playbackStateRef.current === "failed") {
        return;
      }

      const blockReason =
        getIframeBlockReason(iframeRef.current) ||
        (isKnownBlockedIframeUrl(streamUrl) ? "iframe blocked" : null);

      if (blockReason) {
        showReloadOverlay(blockReason);
        return;
      }

      playbackStateRef.current = "playing";
      setPlaybackState("playing");
      setOverlayVisible(false);
    }, IFRAME_BLOCK_CHECK_MS);
  }, [isIframePlayback, showReloadOverlay, streamUrl]);

  const handleIframeError = useCallback(() => {
    showReloadOverlay("iframe");
  }, [showReloadOverlay]);

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
    if (!canPlay || !isHlsPlayback) {
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
  }, [canPlay, contentId, isHlsPlayback, reloadKey]);

  useEffect(() => {
    if (!isHlsPlayback) {
      return undefined;
    }

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

    function handleSuspend() {
      if (!cancelled && video.paused && !userPausedRef.current) {
        video.play().catch(() => {});
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
          backBufferLength: 30,
          enableWorker: true,
          fragLoadingMaxRetry: 4,
          levelLoadingMaxRetry: 4,
          lowLatencyMode: true,
          manifestLoadingMaxRetry: 4,
          startFragPrefetch: true,
        });

        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          playVideo();
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (!data.fatal) {
            return;
          }

          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            attemptSoftRecovery("hls media");
            hls.recoverMediaError();
            return;
          }

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            attemptSoftRecovery("hls network");
            hls.startLoad();
            return;
          }

          showReloadOverlay(data.type ?? "hls");
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
    video.addEventListener("suspend", handleSuspend);
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
      video.removeEventListener("suspend", handleSuspend);
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
    isHlsPlayback,
    reloadKey,
    showOverlay,
    showReloadOverlay,
    streamUrl,
  ]);

  useEffect(() => {
    if (!isIframePlayback) {
      return undefined;
    }

    clearStreamTimers();
    hlsRef.current?.destroy();
    hlsRef.current = null;
    userPausedRef.current = false;
    setOverlayVisible(false);

    if (!content || !streamUrl || !canPlay) {
      showReloadOverlay("missing iframe");
      return undefined;
    }

    setPlaybackState("loading");
    iframeLoadTimerRef.current = window.setTimeout(() => {
      if (import.meta.env.DEV) {
        console.warn("Iframe channel did not report load in time.");
      }

      showReloadOverlay("iframe timeout");
    }, IFRAME_LOAD_TIMEOUT_MS);

    return () => {
      if (iframeLoadTimerRef.current) {
        window.clearTimeout(iframeLoadTimerRef.current);
        iframeLoadTimerRef.current = null;
      }
    };
  }, [
    canPlay,
    clearStreamTimers,
    content,
    iframeReloadKey,
    isIframePlayback,
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

      if (
        remoteKey.action === "UP" ||
        remoteKey.action === "RIGHT" ||
        remoteKey.action === "CHANNEL_UP"
      ) {
        switchToNextChannel();
        return;
      }

      if (
        remoteKey.action === "DOWN" ||
        remoteKey.action === "LEFT" ||
        remoteKey.action === "CHANNEL_DOWN"
      ) {
        switchToPreviousChannel();
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
    switchToNextChannel,
    switchToPreviousChannel,
    togglePlayback,
    tuneBufferedChannel,
  ]);

  const title = content?.title ?? "";
  const showChrome = overlayVisible && !isReloadVisible && content;
  const isIframeReady = isIframePlayback && playbackState === "playing";

  if (isIframePlayback) {
    return (
      <div
        className={`iframe-player-page ${
          isReloadVisible ? "iframe-player-page--failed" : ""
        }`}
      >
        <div className="iframe-crop-wrapper">
          <iframe
            ref={iframeRef}
            key={iframeReloadKey}
            src={streamUrl}
            title={title}
            className={`cropped-live-iframe ${
              isIframeReady ? "cropped-live-iframe--ready" : ""
            }`}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            tabIndex={-1}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        </div>

        <div className="iframe-top-mask" />
        <div className="iframe-bottom-mask" />

        {isReloadVisible && (
          <button
            ref={reloadButtonRef}
            type="button"
            data-player-action="true"
            className="center-reload-button"
            autoFocus
            onClick={reloadCurrentStream}
          >
            გადატვირთვა
          </button>
        )}

        <ChannelNumberOverlay
          channel={numberOverlay.channel}
          digit={numberOverlay.digit}
          message={numberOverlay.message}
          visible={numberOverlay.visible}
        />
      </div>
    );
  }

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
            className="center-reload-button"
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
