import { useEffect } from "react";
import {
  getRemoteKey,
  handledRemoteActions,
  REMOTE_THROTTLE_MS,
} from "../utils/remoteKeys.js";

const focusableSelector = '[data-tv-focusable="true"]';
const focusedClassName = "is-focused";
const keyMap = {
  LEFT: "left",
  RIGHT: "right",
  UP: "up",
  DOWN: "down",
};

function getFocusableElements() {
  return Array.from(document.querySelectorAll(focusableSelector)).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.offsetParent !== null,
  );
}

function getInitialFocusableElement() {
  const elements = getFocusableElements();

  return (
    elements.find((element) => element.dataset.tvAutofocus === "true") ??
    elements.find((element) => element.closest("main")) ??
    elements[0] ??
    null
  );
}

function clearFocusedClass() {
  document
    .querySelectorAll(`${focusableSelector}.${focusedClassName}`)
    .forEach((element) => element.classList.remove(focusedClassName));
}

function markFocusedElement(element) {
  clearFocusedClass();
  element?.classList.add(focusedClassName);
}

function centerOf(element) {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function scrollWithinContainer(element) {
  const container = element?.closest?.("[data-tv-scroll-container='true']");

  if (!container) {
    return false;
  }

  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(container);
  const scrollPaddingTop = Number.parseFloat(styles.scrollPaddingTop) || 12;
  const scrollPaddingBottom =
    Number.parseFloat(styles.scrollPaddingBottom) || 12;
  const topEdge = containerRect.top + scrollPaddingTop;
  const bottomEdge = containerRect.bottom - scrollPaddingBottom;

  if (elementRect.top < topEdge) {
    container.scrollTop -= topEdge - elementRect.top;
    return true;
  }

  if (elementRect.bottom > bottomEdge) {
    container.scrollTop += elementRect.bottom - bottomEdge;
    return true;
  }

  return true;
}

function findNextElement(currentElement, direction) {
  const elements = getFocusableElements();

  if (elements.length === 0) {
    return null;
  }

  if (!currentElement || !elements.includes(currentElement)) {
    return elements[0];
  }

  const currentCenter = centerOf(currentElement);

  const candidates = elements
    .filter((element) => element !== currentElement)
    .map((element) => {
      const elementCenter = centerOf(element);
      const deltaX = elementCenter.x - currentCenter.x;
      const deltaY = elementCenter.y - currentCenter.y;
      const horizontal = direction === "left" || direction === "right";
      const primaryDistance = horizontal ? Math.abs(deltaX) : Math.abs(deltaY);
      const secondaryDistance = horizontal ? Math.abs(deltaY) : Math.abs(deltaX);

      return {
        element,
        deltaX,
        deltaY,
        score: primaryDistance + secondaryDistance * 1.7,
      };
    })
    .filter(({ deltaX, deltaY }) => {
      if (direction === "left") return deltaX < -8;
      if (direction === "right") return deltaX > 8;
      if (direction === "up") return deltaY < -8;
      return deltaY > 8;
    })
    .sort((first, second) => first.score - second.score);

  return candidates[0]?.element ?? currentElement;
}

export function useSpatialNavigation(onBack, routeKey, enabled = true) {
  useEffect(() => {
    if (!enabled) {
      clearFocusedClass();
      return undefined;
    }

    const focusFirstElement = window.setTimeout(() => {
      const firstElement = getInitialFocusableElement();
      firstElement?.focus({ preventScroll: true });
      markFocusedElement(firstElement);
      firstElement
        ?.closest?.("[data-tv-scroll-container='true']")
        ?.scrollTo({ top: 0, behavior: "auto" });
    }, 30);

    return () => window.clearTimeout(focusFirstElement);
  }, [enabled, routeKey]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let lastArrowEventAt = 0;
    let lastScrolledElement = null;
    let lastScrollAt = 0;

    function handleFocusIn(event) {
      if (event.target?.matches?.(focusableSelector)) {
        markFocusedElement(event.target);
      }
    }

    function handleFocusOut(event) {
      if (event.target?.matches?.(focusableSelector)) {
        event.target.classList.remove(focusedClassName);
      }
    }

    function handleKeyDown(event) {
      const remoteKey = getRemoteKey(event);

      if (!remoteKey || !handledRemoteActions.has(remoteKey.action)) {
        return;
      }

      if (remoteKey.action === "NUMBER" || remoteKey.action.startsWith("CHANNEL")) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (remoteKey.action in keyMap) {
        const now = performance.now();

        if (now - lastArrowEventAt < REMOTE_THROTTLE_MS) {
          return;
        }

        lastArrowEventAt = now;

        const nextElement = findNextElement(
          document.activeElement,
          keyMap[remoteKey.action],
        );

        if (!nextElement || nextElement === document.activeElement) {
          return;
        }

        nextElement?.focus({ preventScroll: true });
        markFocusedElement(nextElement);

        if (lastScrolledElement !== nextElement || now - lastScrollAt > 320) {
          lastScrolledElement = nextElement;
          lastScrollAt = now;

          if (!scrollWithinContainer(nextElement)) {
            nextElement.scrollIntoView({
              block: "nearest",
              inline: "nearest",
              behavior: "auto",
            });
          }
        }

        return;
      }

      if (remoteKey.action === "ENTER") {
        const activeElement = document.activeElement;

        if (activeElement?.matches?.(focusableSelector)) {
          activeElement.click();
        }

        return;
      }

      if (remoteKey.action === "BACK") {
        onBack();
      }
    }

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, onBack]);
}
