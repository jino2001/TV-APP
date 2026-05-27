export const REMOTE_THROTTLE_MS = 130;
export const CHANNEL_SWITCH_THROTTLE_MS = 250;

const actionAliases = {
  ArrowUp: "UP",
  Up: "UP",
  DPAD_UP: "UP",
  ArrowDown: "DOWN",
  Down: "DOWN",
  DPAD_DOWN: "DOWN",
  ArrowLeft: "LEFT",
  Left: "LEFT",
  DPAD_LEFT: "LEFT",
  ArrowRight: "RIGHT",
  Right: "RIGHT",
  DPAD_RIGHT: "RIGHT",
  Enter: "ENTER",
  NumpadEnter: "ENTER",
  DPAD_CENTER: "ENTER",
  " ": "SPACE",
  Space: "SPACE",
  Spacebar: "SPACE",
  Backspace: "BACK",
  Escape: "BACK",
  Back: "BACK",
  BACK: "BACK",
  BrowserBack: "BACK",
  GoBack: "BACK",
  ChannelUp: "CHANNEL_UP",
  ChannelDown: "CHANNEL_DOWN",
  PageUp: "CHANNEL_UP",
  PageDown: "CHANNEL_DOWN",
};

const codeDigitAliases = {
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Digit4: "4",
  Digit5: "5",
  Numpad1: "1",
  Numpad2: "2",
  Numpad3: "3",
  Numpad4: "4",
  Numpad5: "5",
};

const keyCodeAliases = {
  4: "BACK",
  8: "BACK",
  13: "ENTER",
  19: "UP",
  20: "DOWN",
  21: "LEFT",
  22: "RIGHT",
  23: "ENTER",
  27: "BACK",
  32: "SPACE",
  33: "CHANNEL_UP",
  34: "CHANNEL_DOWN",
  49: "1",
  50: "2",
  51: "3",
  52: "4",
  53: "5",
  66: "ENTER",
  97: "1",
  98: "2",
  99: "3",
  100: "4",
  101: "5",
  111: "BACK",
  166: "BACK",
  427: "CHANNEL_UP",
  428: "CHANNEL_DOWN",
};

export const handledRemoteActions = new Set([
  "UP",
  "DOWN",
  "LEFT",
  "RIGHT",
  "ENTER",
  "SPACE",
  "BACK",
  "CHANNEL_UP",
  "CHANNEL_DOWN",
  "NUMBER",
]);

export function getRemoteKey(event) {
  const digit =
    codeDigitAliases[event.code] ??
    (/^[1-5]$/.test(event.key) ? event.key : null) ??
    (typeof keyCodeAliases[event.keyCode] === "string" &&
    /^[1-5]$/.test(keyCodeAliases[event.keyCode])
      ? keyCodeAliases[event.keyCode]
      : null);

  if (digit) {
    return { action: "NUMBER", digit };
  }

  const action =
    actionAliases[event.key] ??
    actionAliases[event.code] ??
    keyCodeAliases[event.keyCode] ??
    keyCodeAliases[event.which] ??
    null;

  return action ? { action } : null;
}

export function isRemoteKey(event) {
  const remoteKey = getRemoteKey(event);
  return Boolean(remoteKey && handledRemoteActions.has(remoteKey.action));
}
