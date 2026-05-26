import { useCallback, useMemo, useState } from "react";
import Header from "./components/Header.jsx";
import Home from "./pages/Home.jsx";
import Details from "./pages/Details.jsx";
import Player from "./pages/Player.jsx";
import { TV_PERFORMANCE_MODE } from "./config/performance.js";
import { contentItems, isPlayableItem } from "./data/content.js";
import { useSpatialNavigation } from "./hooks/useSpatialNavigation.js";

const FAVORITES_STORAGE_KEY = "personal-tv-favorites";
const defaultFavoriteIds = contentItems
  .filter((item) => item.isFavorite)
  .map((item) => item.id);
const contentIdSet = new Set(contentItems.map((item) => item.id));

function readFavoriteIds() {
  if (typeof window === "undefined") {
    return defaultFavoriteIds;
  }

  try {
    const savedValue = window.localStorage.getItem(FAVORITES_STORAGE_KEY);

    if (!savedValue) {
      return defaultFavoriteIds;
    }

    const parsedValue = JSON.parse(savedValue);

    if (!Array.isArray(parsedValue)) {
      return defaultFavoriteIds;
    }

    return parsedValue.filter((id) => contentIdSet.has(id));
  } catch {
    return defaultFavoriteIds;
  }
}

function saveFavoriteIds(favoriteIds) {
  try {
    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(favoriteIds),
    );
  } catch {
    // Favorites still update for the current session if storage is unavailable.
  }
}

export default function App() {
  const [screen, setScreen] = useState({ page: "home", contentId: null });
  const [, setHistory] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(readFavoriteIds);
  const isPlayerScreen = screen.page === "player";

  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const contentWithFavorites = useMemo(
    () =>
      contentItems.map((item) => ({
        ...item,
        isFavorite: favoriteIdSet.has(item.id),
      })),
    [favoriteIdSet],
  );

  const activeContent = useMemo(
    () =>
      contentWithFavorites.find((item) => item.id === screen.contentId) ??
      contentWithFavorites[0],
    [contentWithFavorites, screen.contentId],
  );

  const openScreen = useCallback((nextScreen) => {
    setHistory((previous) => [...previous, screen]);
    setScreen(nextScreen);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [screen]);

  const goHome = useCallback(() => {
    setHistory((previous) => [...previous, screen]);
    setScreen({ page: "home", contentId: null });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [screen]);

  const goBack = useCallback(() => {
    if (screen.page === "home") {
      return;
    }

    setHistory((previous) => {
      const nextHistory = previous.slice(0, -1);
      const previousScreen =
        previous[previous.length - 1] ?? { page: "home", contentId: null };
      setScreen(previousScreen);
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return nextHistory;
    });
  }, [screen.page]);

  useSpatialNavigation(goBack, `${screen.page}-${screen.contentId ?? "home"}`);

  const showDetails = useCallback(
    (contentId) => openScreen({ page: "details", contentId }),
    [openScreen],
  );

  const playContent = useCallback(
    (contentId) => {
      const targetContent = contentWithFavorites.find(
        (item) => item.id === contentId,
      );

      if (!isPlayableItem(targetContent)) {
        return;
      }

      openScreen({ page: "player", contentId });
    },
    [contentWithFavorites, openScreen],
  );

  const toggleFavorite = useCallback((contentId) => {
    setFavoriteIds((currentIds) => {
      const nextIds = currentIds.includes(contentId)
        ? currentIds.filter((id) => id !== contentId)
        : [...currentIds, contentId];

      saveFavoriteIds(nextIds);
      return nextIds;
    });
  }, []);

  return (
    <div
      className={`tv-app ${isPlayerScreen ? "tv-app--player" : ""} ${
        TV_PERFORMANCE_MODE ? "tv-app--performance" : ""
      }`}
    >
      {!isPlayerScreen && <Header currentPage={screen.page} onHome={goHome} />}

      <main className={`tv-main ${isPlayerScreen ? "tv-main--player" : ""}`}>
        {screen.page === "home" && (
          <Home
            contentItems={contentWithFavorites}
            onOpenDetails={showDetails}
          />
        )}

        {screen.page === "details" && (
          <Details
            contentItems={contentWithFavorites}
            contentId={screen.contentId}
            onToggleFavorite={toggleFavorite}
            onBack={goHome}
            onOpenDetails={showDetails}
            onPlay={playContent}
          />
        )}

        {screen.page === "player" && (
          <Player
            key={activeContent.id}
            contentId={screen.contentId}
            contentItems={contentWithFavorites}
            onBack={goBack}
          />
        )}
      </main>
    </div>
  );
}
