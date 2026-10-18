# Rebounding Timer

A very simple, very big count-up timer for an iPad, made for glancing at during an exercise class.

- **Digital mode:** huge `M:SS` that keeps counting up indefinitely (switches to `H:MM:SS` after an hour).
- **Analog mode:** one seconds sweep per minute, with no hour or minute hands. Only **60** and **30** are labelled. The ring fills **green for 0–30 s** and **amber for 30–60 s**, so you can tell which half of the minute you're in from across the room.
- The screen **flashes briefly at every 30-second mark**.
- The buttons fade away a few seconds after you press Start. Tap anywhere to bring them back.
- Reset needs two taps, so it can't be pressed by accident.
- The screen is kept awake with the Screen Wake Lock API. The status next to the buttons says whether this is working.
- Works offline once it has been opened, and keeps the running time if the app is reloaded.

It's a plain static site (HTML/CSS/JS): no build step and no dependencies.

## Hosting (GitHub Pages)

1. On GitHub, go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, then branch `main` and folder `/ (root)`.
3. The app will be at `https://<user>.github.io/rebounding-timer/`.

## Installing on the iPad

1. Open the URL in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Open it from the home screen icon. It runs full screen with no browser bars.

## Stopping notifications and sleep

A web app can't block notifications itself. iPadOS handles that:

- **Do Not Disturb / Focus:** swipe down from the top-right to open Control Centre and turn on **Focus → Do Not Disturb** before class.
- **Guided Access (recommended):** this locks the iPad into the timer app so nobody can accidentally leave it, and stops notification banners appearing.
  - Turn it on once in **Settings → Accessibility → Guided Access** and set a passcode.
  - In the same screen, set **Display Auto-Lock** to **Never**.
  - To start it, open the timer and triple-click the top (or Home) button, then tap **Start**. Triple-click again and enter the passcode to exit.
- **Backup for screen sleep:** the app keeps the screen on by itself on iPadOS 18.4 and later. On older versions, set **Settings → Display & Brightness → Auto-Lock → Never** for the class.

## Local development

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

If you change the assets, bump `CACHE` in `sw.js`.
