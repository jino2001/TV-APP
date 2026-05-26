# Personal TV App

A simple personal Smart TV-style streaming app built with React and Vite. It uses local data only, no backend, no authentication, and no subscriptions.

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Open the local URL shown by Vite, usually:

```text
http://localhost:5173
```

## Add Channels Or Videos

Edit `src/data/content.js` and add a new object inside `contentItems`.

```js
{
  id: "my-channel",
  title: "My Channel",
  description: "My personal stream.",
  type: "channel", // "channel", "movie", or "sport"
  category: "News",
  image: "https://example.com/image.jpg",
  playbackType: "hls", // "hls", "iframe", or "external"
  streamUrl: "https://example.com/stream.m3u8",
  backupStreamUrls: ["https://example.com/backup.m3u8"],
  isFavorite: false,
}
```

Use `.m3u8` for HLS streams or a direct video URL such as `.mp4`. Add `backupStreamUrls` when a channel has more than one playlist. Favorites can also be changed inside the app and are saved in `localStorage`.

## Live TV Stream Notes

- This app uses local `.m3u8` stream URLs from `src/data/content.js`.
- Some streams use `http://` and may work locally but fail after HTTPS deployment because browsers block mixed content.
- Some streams may fail because of CORS, geo-blocking, server downtime, or unsupported codecs.
- In development, the Player includes `Use Test Stream` and `Next Source` buttons for debugging.
- Test streams first in VLC, then in the browser app.

## Official Player Pages

Some live TV links are not direct `.m3u8` streams. For example, `https://player.1tv.ge/1tv` is an official web player page. These links should use `playbackType: "iframe"` or `playbackType: "external"`, not `"hls"`. If iframe embedding is blocked on Smart TV, change `playbackType` to `"external"`.

## Build

```bash
npm run build
```

The production files will be created in `dist/`.

## Android TV APK

This app is configured with Capacitor for Android TV / Google TV packaging.
Install Android Studio with the Android SDK and set `JAVA_HOME` before building an APK from the command line.

```bash
npm install
npm run build
npx cap sync android
```

Open the native project in Android Studio:

```bash
npm run android:open
```

Build a debug APK from the command line:

```bash
npm run android:build
```

The debug APK is created under `android/app/build/outputs/apk/debug/` when the Android SDK and JDK are installed. The Android manifest includes both `LAUNCHER` and `LEANBACK_LAUNCHER`, optional touchscreen support, leanback support, landscape orientation, fullscreen mode, and internet permission.

### Build APK With GitHub Actions

Push this project to GitHub, then open:

```text
Actions -> Build Android TV APK -> Run workflow
```

When the workflow finishes, download the `personal-tv-debug-apk` artifact. It contains the generated debug APK. The workflow installs Node, Java, Android SDK packages, builds the Vite app, runs `npx cap sync android`, and builds `android/app/build/outputs/apk/debug/*.apk`.

## Notes

- Home, Details, and Player pages are included.
- Keyboard/remote navigation supports arrows, Enter, Space, Backspace, and Escape.
- HLS playback uses native browser support when available and falls back to `hls.js`.
- This is intentionally personal-use focused and backend-free.
"# TV-APP" 
