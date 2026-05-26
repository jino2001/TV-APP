import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FocusableButton from "../components/FocusableButton.jsx";
import {
  contentItems as localContentItems,
  contentTypeLabels,
  getContentColors,
  getContentStreamUrls,
  getPlaybackType,
  isKnownPlaybackType,
  playbackTypeLabels,
} from "../data/content.js";
import { getContentById } from "../utils/contentUtils.js";

const TEST_HLS_URL = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
const STREAM_LOAD_ERROR = "The stream could not be loaded.";
const MISSING_STREAM_ERROR = "Stream URL is missing.";
const MIXED_CONTENT_MESSAGE =
  "This HTTP stream may be blocked on HTTPS deployments because of mixed-content restrictions.";
const CORS_MESSAGE =
  "The stream may be blocked by CORS. VLC can play some streams that browsers cannot.";
const TEST_SUCCESS_MESSAGE =
  "The player works with test streams, so this channel URL is likely unavailable or browser-blocked.";
const IFRAME_BLOCKED_MESSAGE =
  "This live player cannot be embedded. Open it externally instead.";
const EXTERNAL_PLAYER_MESSAGE =
  "Direct HLS stream is unavailable. Open the official live page externally.";
const UNKNOWN_PLAYBACK_MESSAGE = "Unknown playback type.";
const INACTIVE_MESSAGE = "This channel is currently unavailable.";
const IFRAME_LOAD_TIMEOUT = 7000;

function supportsNativeHls(videoElement) {
  return (
    videoElement.canPlayType("application/vnd.apple.mpegurl") ||
    videoElement.canPlayType("application/x-mpegURL")
  );
}

function getVideoErrorDetails(videoElement) {
  const error = videoElement.error;

  if (!error) {
    return null;
  }

  return {
    code: error.code,
    message: error.message,
    mediaError: {
      1: "MEDIA_ERR_ABORTED",
      2: "MEDIA_ERR_NETWORK",
      3: "MEDIA_ERR_DECODE",
      4: "MEDIA_ERR_SRC_NOT_SUPPORTED",
    }[error.code],
  };
}

export default function Player({
  contentId,
  contentItems = localContentItems,
  onBack,
}) {
  const content = getContentById(contentId, contentItems);
  const videoRef = useRef(null);
  const [playbackState, setPlaybackState] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [useTestStream, setUseTestStream] = useState(false);
  const [testPlaybackConfirmed, setTestPlaybackConfirmed] = useState(false);
  const [activeStreamIndex, setActiveStreamIndex] = useState(0);
  const [iframeLoadState, setIframeLoadState] = useState("idle");
  const colors = getContentColors(content);
  const playbackType = getPlaybackType(content);
  const playbackTypeIsKnown = isKnownPlaybackType(playbackType);
  const isHlsPlayback = playbackType === "hls";
  const isIframePlayback = playbackType === "iframe";
  const isExternalPlayback = playbackType === "external";
  const devToolsEnabled = import.meta.env.DEV;

  const hlsStreamUrls = useMemo(
    () => (isHlsPlayback ? getContentStreamUrls(content) : []),
    [content, isHlsPlayback],
  );
  const streamUrls = useMemo(() => {
    if (isHlsPlayback) {
      return useTestStream ? [TEST_HLS_URL] : hlsStreamUrls;
    }

    return content?.streamUrl ? [content.streamUrl] : [];
  }, [content?.streamUrl, hlsStreamUrls, isHlsPlayback, useTestStream]);
  const streamUrl = streamUrls[activeStreamIndex] ?? "";
  const hasMissingStream = !streamUrl;
  const isHttpStream = streamUrl.startsWith("http://");
  const canUseSource = Boolean(
    content?.isActive && playbackTypeIsKnown && streamUrl,
  );

  const unavailableMessage = !content
    ? "Item not found."
    : !playbackTypeIsKnown
      ? UNKNOWN_PLAYBACK_MESSAGE
      : hasMissingStream
        ? MISSING_STREAM_ERROR
        : !content.isActive
          ? INACTIVE_MESSAGE
          : "";

  const setReadableError = useCallback(
    (message = STREAM_LOAD_ERROR) => {
      setPlaybackState("error");
      setErrorMessage(message);
      setNoticeMessage("");
    },
    [],
  );

  const openExternalPlayer = useCallback(() => {
    const urlToOpen = streamUrl || content?.streamUrl;

    if (urlToOpen) {
      window.open(urlToOpen, "_blank");
    }
  }, [content?.streamUrl, streamUrl]);

  const playVideo = useCallback(async () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    try {
      await video.play();
    } catch (error) {
      if (devToolsEnabled) {
        console.warn("[TV Player] video.play() failed", error);
      }
      setPlaybackState("paused");
      setNoticeMessage("Playback is ready, but autoplay was blocked. Press Enter or Space to start.");
    }
  }, [devToolsEnabled]);

  const togglePlayback = useCallback(async () => {
    const video = videoRef.current;

    if (
      !isHlsPlayback ||
      !video ||
      playbackState === "error" ||
      !canUseSource
    ) {
      return;
    }

    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch (error) {
      if (devToolsEnabled) {
        console.warn("[TV Player] manual play/pause failed", error);
      }
      setReadableError(STREAM_LOAD_ERROR);
    }
  }, [canUseSource, devToolsEnabled, isHlsPlayback, playbackState, setReadableError]);

  const switchToTestStream = useCallback(() => {
    setActiveStreamIndex(0);
    setErrorMessage("");
    setNoticeMessage("Using built-in test HLS stream.");
    setPlaybackState("loading");
    setUseTestStream(true);
  }, []);

  const switchToChannelStream = useCallback(() => {
    setActiveStreamIndex(0);
    setErrorMessage("");
    setNoticeMessage("");
    setPlaybackState(hlsStreamUrls.length > 0 ? "loading" : "error");
    setUseTestStream(false);
  }, [hlsStreamUrls.length]);

  const switchToNextStream = useCallback(() => {
    if (streamUrls.length < 2) {
      return;
    }

    setErrorMessage("");
    setPlaybackState("loading");
    setNoticeMessage("Switching stream source.");
    setActiveStreamIndex((currentIndex) => (currentIndex + 1) % streamUrls.length);
  }, [streamUrls.length]);

  useEffect(() => {
    setActiveStreamIndex(0);
    setErrorMessage("");
    setNoticeMessage(isHlsPlayback && useTestStream ? "Using built-in test HLS stream." : "");
    setPlaybackState(streamUrls.length > 0 ? "loading" : "error");
  }, [contentId, isHlsPlayback, streamUrls.length, useTestStream]);

  useEffect(() => {
    if (!streamUrl) {
      return;
    }

    if (isHttpStream) {
      if (devToolsEnabled) {
        console.warn(`[TV Player] ${MIXED_CONTENT_MESSAGE}`, streamUrl);
      }
    }
  }, [devToolsEnabled, isHttpStream, streamUrl]);

  useEffect(() => {
    if (!isIframePlayback || !canUseSource) {
      setIframeLoadState("idle");
      return undefined;
    }

    setIframeLoadState("loading");

    const fallbackTimer = window.setTimeout(() => {
      setIframeLoadState((currentState) =>
        currentState === "loading" ? "blocked" : currentState,
      );
    }, IFRAME_LOAD_TIMEOUT);

    return () => window.clearTimeout(fallbackTimer);
  }, [canUseSource, isIframePlayback, streamUrl]);

  useEffect(() => {
    const video = videoRef.current;

    if (!isHlsPlayback || !video || !canUseSource) {
      return undefined;
    }

    let hls;
    let cancelled = false;
    const nativeHlsSupported = Boolean(supportsNativeHls(video));

    if (devToolsEnabled) {
      console.groupCollapsed("[TV Player] HLS diagnostics");
      console.info("Selected title:", content?.title ?? "Missing item");
      console.info("Selected streamUrl:", streamUrl);
      console.info("Stream source index:", `${activeStreamIndex + 1} of ${streamUrls.length}`);
      console.info("Available stream URLs:", streamUrls);
      console.info("Playback type:", playbackType);
      console.info("Using test stream:", useTestStream);
      console.info("Starts with http://:", isHttpStream);
      console.info("Native HLS support:", nativeHlsSupported);
      console.groupEnd();
    }

    function tryNextStreamSource() {
      if (activeStreamIndex >= streamUrls.length - 1) {
        return false;
      }

      const nextIndex = activeStreamIndex + 1;

      if (devToolsEnabled) {
        console.warn("[TV Player] stream source failed, trying backup", {
          failedUrl: streamUrl,
          nextUrl: streamUrls[nextIndex],
          nextIndex: nextIndex + 1,
          totalSources: streamUrls.length,
        });
      }

      setErrorMessage("");
      setPlaybackState("loading");
      setNoticeMessage(
        `Source ${activeStreamIndex + 1} failed. Trying source ${nextIndex + 1} of ${streamUrls.length}.`,
      );
      setActiveStreamIndex(nextIndex);
      return true;
    }

    function setStreamLoadError() {
      if (!cancelled) {
        if (!tryNextStreamSource()) {
          setReadableError(STREAM_LOAD_ERROR);
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
        setNoticeMessage(useTestStream ? "Test stream loaded successfully. Player and HLS playback are working." : "");

        if (useTestStream) {
          setTestPlaybackConfirmed(true);
        }
      }
    }

    function handlePause() {
      if (!cancelled && !video.ended) {
        setPlaybackState("paused");
      }
    }

    function handleVideoError() {
      if (devToolsEnabled) {
        console.error("[TV Player] video element error", getVideoErrorDetails(video));
      }
      setStreamLoadError();
    }

    async function setupNativeHls() {
      video.src = streamUrl;
      video.load();
      video.addEventListener("loadedmetadata", playVideo, { once: true });
    }

    async function setupHlsJs() {
      try {
        const { default: Hls } = await import("hls.js");

        if (cancelled) {
          return;
        }

        if (devToolsEnabled) {
          console.info("[TV Player] hls.js support:", Hls.isSupported());
        }

        if (!Hls.isSupported()) {
          setStreamLoadError();
          return;
        }

        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!cancelled) {
            playVideo();
          }
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (devToolsEnabled) {
            console.error("[TV Player] hls.js error", data);
          }

          if (data.fatal) {
            setStreamLoadError();
          }
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);
      } catch (error) {
        if (devToolsEnabled) {
          console.error("[TV Player] failed to initialize hls.js", error);
        }
        setStreamLoadError();
      }
    }

    video.pause();
    video.removeAttribute("src");
    video.load();
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("pause", handlePause);
    video.addEventListener("error", handleVideoError);

    if (nativeHlsSupported) {
      setupNativeHls();
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
      video.removeEventListener("error", handleVideoError);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [
    activeStreamIndex,
    canUseSource,
    content,
    devToolsEnabled,
    isHlsPlayback,
    isHttpStream,
    playbackType,
    playVideo,
    setReadableError,
    streamUrl,
    streamUrls,
    useTestStream,
  ]);

  useEffect(() => {
    function handleRemoteKeys(event) {
      const focusedAction = document.activeElement?.closest?.("[data-player-action]");
      const isActivationKey =
        event.key === "Enter" ||
        event.key === " " ||
        event.code === "Space" ||
        event.key === "Spacebar";

      if (isActivationKey && focusedAction) {
        event.preventDefault();
        event.stopPropagation();
        focusedAction.click();
        return;
      }

      if (isHlsPlayback && isActivationKey) {
        event.preventDefault();
        event.stopPropagation();
        togglePlayback();
        return;
      }

      if (event.key === "Backspace" || event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onBack();
      }
    }

    window.addEventListener("keydown", handleRemoteKeys, true);

    return () => window.removeEventListener("keydown", handleRemoteKeys, true);
  }, [isHlsPlayback, onBack, togglePlayback]);

  const statusText = (() => {
    if (unavailableMessage) {
      return "Unavailable";
    }

    if (isIframePlayback) {
      return iframeLoadState === "blocked" ? "Embed Blocked" : "Official Player";
    }

    if (isExternalPlayback) {
      return "External Player";
    }

    return {
      loading: "Loading",
      playing: "Playing",
      paused: "Paused",
      error: "Stream Error",
    }[playbackState];
  })();

  const hlsDiagnostics = [
    hasMissingStream ? MISSING_STREAM_ERROR : "",
    isHttpStream ? MIXED_CONTENT_MESSAGE : "",
    playbackState === "error" ? CORS_MESSAGE : "",
    !useTestStream && streamUrls.length > 1 && playbackState === "error"
      ? `Tried ${streamUrls.length} stream sources for this channel.`
      : "",
    testPlaybackConfirmed && !useTestStream && playbackState === "error"
      ? TEST_SUCCESS_MESSAGE
      : "",
  ].filter(Boolean);

  const title = useTestStream ? "HLS Test Stream" : content?.title ?? "Stream unavailable";
  const playerLabel = playbackTypeLabels[playbackType] ?? UNKNOWN_PLAYBACK_MESSAGE;
  const showUnavailableOverlay = Boolean(unavailableMessage);
  const isHlsPlaying = isHlsPlayback && playbackState === "playing";
  const showTopbar = !isHlsPlaying;
  const showPlayerOverlay = !isHlsPlaying;

  return (
    <div
      className="player-page"
      style={{
        "--poster-start": colors[0],
        "--poster-mid": colors[1],
        "--poster-end": colors[2],
      }}
    >
      <section
        className={`player-stage player-stage--${playbackTypeIsKnown ? playbackType : "unknown"}`}
        aria-label={`${title} player`}
      >
        {isHlsPlayback && (
          <video
            ref={videoRef}
            className="player-video"
            poster={content?.image || undefined}
            playsInline
            preload="auto"
          />
        )}

        {isIframePlayback && canUseSource && (
          <iframe
            className="player-iframe"
            title={`${content.title} official live player`}
            src={streamUrl}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            onLoad={() => setIframeLoadState("loaded")}
            onError={() => setIframeLoadState("blocked")}
          />
        )}

        <div className="player-chrome">
          {showTopbar && (
            <div className="player-topbar">
              <span>{contentTypeLabels[content?.type] ?? "Stream"}</span>
              <span>{statusText}</span>
            </div>
          )}

          {showUnavailableOverlay && (
            <div className="player-state player-state--error" role="alert">
              <strong>Stream not available</strong>
              <p>{unavailableMessage}</p>
            </div>
          )}

          {isHlsPlayback && canUseSource && playbackState === "loading" && (
            <div className="player-state player-state--loading" role="status">
              <span className="loading-ring" />
              <strong>Loading stream</strong>
              {noticeMessage && <p>{noticeMessage}</p>}
            </div>
          )}

          {isHlsPlayback && canUseSource && playbackState === "error" && (
            <div className="player-state player-state--error" role="alert">
              <strong>Stream not available</strong>
              <p>{errorMessage || STREAM_LOAD_ERROR}</p>
              {hlsDiagnostics.length > 0 && (
                <ul className="player-diagnostics">
                  {hlsDiagnostics.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {isHlsPlayback && playbackState === "paused" && (
            <div className="player-state player-state--paused" role="status">
              <strong>Paused</strong>
              {noticeMessage && <p>{noticeMessage}</p>}
            </div>
          )}

          {isIframePlayback && canUseSource && iframeLoadState === "loading" && (
            <div className="player-state player-state--loading" role="status">
              <span className="loading-ring" />
              <strong>Loading official player</strong>
              <p>{streamUrl}</p>
            </div>
          )}

          {isIframePlayback && canUseSource && iframeLoadState === "blocked" && (
            <div className="player-state player-state--error" role="alert">
              <strong>Official player blocked</strong>
              <p>{IFRAME_BLOCKED_MESSAGE}</p>
            </div>
          )}

          {isExternalPlayback && canUseSource && (
            <div className="player-external-panel">
              <span className="eyebrow">{playerLabel}</span>
              <h1>{title}</h1>
              <p>{EXTERNAL_PLAYER_MESSAGE}</p>
              <p className="player-source">{streamUrl}</p>
              <div className="player-actions player-actions--center">
                <FocusableButton data-player-action="true" onClick={openExternalPlayer}>
                  Open Live
                </FocusableButton>
                <FocusableButton
                  variant="secondary"
                  data-player-action="true"
                  onClick={onBack}
                >
                  Back
                </FocusableButton>
              </div>
            </div>
          )}

          {!isExternalPlayback && showPlayerOverlay && (
            <div className="player-overlay">
              <div>
                <span className="eyebrow">
                  {useTestStream ? "Diagnostic Test Stream" : playerLabel}
                </span>
                <h1>{title}</h1>
                <p className="player-source">{streamUrl || "No stream URL"}</p>
                {isHlsPlayback && streamUrls.length > 1 && (
                  <p className="player-source player-source--fallback">
                    Source {activeStreamIndex + 1} of {streamUrls.length}
                  </p>
                )}
                {noticeMessage && playbackState === "playing" && (
                  <p className="player-source player-source--fallback">
                    {noticeMessage}
                  </p>
                )}
              </div>

              <div className="player-actions">
                <FocusableButton
                  variant="ghost"
                  data-player-action="true"
                  onClick={onBack}
                >
                  Back
                </FocusableButton>
                {isIframePlayback && canUseSource && (
                  <FocusableButton
                    variant="secondary"
                    data-player-action="true"
                    onClick={openExternalPlayer}
                  >
                    Open External
                  </FocusableButton>
                )}
                {isHlsPlayback && devToolsEnabled && (
                  <FocusableButton
                    variant="secondary"
                    data-player-action="true"
                    onClick={useTestStream ? switchToChannelStream : switchToTestStream}
                  >
                    {useTestStream ? "Use Channel Stream" : "Use Test Stream"}
                  </FocusableButton>
                )}
                {isHlsPlayback && devToolsEnabled && !useTestStream && streamUrls.length > 1 && (
                  <FocusableButton
                    variant="secondary"
                    data-player-action="true"
                    onClick={switchToNextStream}
                  >
                    Next Source
                  </FocusableButton>
                )}
              </div>

              <div className="player-hints" aria-hidden="true">
                {isHlsPlayback && <span>Enter / Space: Play/Pause</span>}
                <span>Arrow Keys: Move Focus</span>
                <span>Backspace / Escape: Back</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
