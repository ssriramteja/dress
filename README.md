# sriram teja

A digital wardrobe with a personal stylist you chat with. Created by Sriram Teja Singaraju.

**Live app: https://ssriramteja.github.io/dress/**

It works in any phone or desktop browser. There's nothing to install and no account to make.

---

## Use the app

1. **Open** https://ssriramteja.github.io/dress/ on your phone or computer.
   On iPhone, tap **Share → Add to Home Screen** to open it like an app.
2. **Watch the intro or tap "skip"**, then tap **get started** and **continue**.
3. **Choose how to start:**
   - **try the demo closet**: loads a sample wardrobe of 85 pieces. This is the best way to explore.
   - **use my photos**: pick outfit photos from your device. Automatic garment detection isn't connected yet, so you can tag single-piece photos by category, or switch to the demo.
4. **Review** the pieces it found. Tap a piece to inspect it, or tap **×** to remove anything wrong. Then tap **build my closet** and **open closet**.

### closet

- Filter by **tops, bottoms, outerwear, shoes, caps, bags**, and use **sort** for most worn, least worn, recently worn or colour.
- Each tile shows how often you've worn it. **never worn** is in red.
- Tap the **pile icon** (top right) to see your whole closet as a heap. Drag pieces around, tap one to open it. On a phone, **shake** to switch between grid and pile.
- Tap any piece for details, then:
  - **worn today** logs a wear (once per day).
  - **style this** asks the stylist to build looks around it.

### stylist

Type or tap a suggestion. For example:

- `what should i wear for dinner?`
- `build a look around my black jacket`
- `what haven't i worn lately?`
- `do i own something similar to my navy knit?`
- `pack for five days`

You get **two looks** per request. On each look:
- **save** keeps it in the you tab.
- **shuffle** gives a new version of that look.
- **dislike** replaces it and never suggests it again.
- **wear it** logs every piece as worn today.

Follow up naturally: `more casual`, `warmer`, `without the jacket`, `another one`. Tap any garment in a look to see it, then **back to chat** returns you to the same spot.

The **mic** works in Chrome, Edge and Safari. On a phone, you can also use your keyboard's dictation key.

### you

Shows wardrobe stats, colour breakdown, underused pieces and saved looks. **log out** clears your closet from this device.

> Your data stays in your own browser. Each person who opens the link gets their own private closet. Nothing syncs between devices yet.

---

## Set up and run it yourself

### 1. Requirements

- [Node.js](https://nodejs.org) 20 or newer (`node -v` to check)
- Git
- For running it on your phone: the **Expo Go** app ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)), with SDK 58 support

### 2. Get the code

```bash
git clone https://github.com/ssriramteja/dress.git
cd dress
npm install
```

### 3. Run it

**In your browser:**

```bash
npm run web
```

Open the address it prints (usually http://localhost:8081). Keep the terminal running while you use it.

**On your phone with Expo Go:**

```bash
npm run expo-go       # works from anywhere (uses a tunnel)
# or
npm run expo-go:lan   # faster, phone and computer on the same Wi-Fi
```

Scan the QR code with your camera (iPhone) or the Expo Go app (Android). Keep the terminal running.

### 4. Check it

```bash
npm run typecheck     # TypeScript
npm run test:engine   # stylist logic tests
```

### 5. Build the website

```bash
npm run build:web     # creates dist/
npm run serve:web     # serves dist/ at http://localhost:8080
```

---

## Deploy

### GitHub Pages (how the live link works)

Every push to `main` runs `.github/workflows/pages.yml`, which type-checks, tests, builds and publishes the site. It takes about 2 minutes.

To set it up on your own fork:

1. Fork or push the repo to your GitHub account. Free accounts need the repo to be **public**.
2. Go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Push to `main`. The site appears at `https://<your-username>.github.io/<repo-name>/`.

You can follow progress in the repo's **Actions** tab.

### Netlify (works with a private repo)

1. Sign in at [netlify.com](https://netlify.com) with GitHub.
2. Click **Add new site → Import an existing project** and pick this repo.
3. Netlify reads the included `netlify.toml` automatically. Click **Deploy**.

### Replit

Import the repo into Replit and press **Run**. It builds the website and serves it on port 8080. For Expo Go, run `npm run expo-go` in the Replit Shell.

---

## Project structure

```
src/app/            screens: onboarding, closet, stylist, you
src/storage/        data types and saving to the device
src/catalog/        demo wardrobe and garment drawings
src/extraction/     garment detection (demo + photo path) and de-duplication
src/stylist/        stylist logic and its tests
src/components/     shared UI: tiles, look cards, garment sheet, pile, tab bar
src/onboarding/     intro, splash and setup steps
src/hooks/          reduced motion, shake detection, voice input
```

Built with Expo SDK 58, React Native, TypeScript and Expo Router.

---

## What's demo-only

- **Detecting garments in your own photos isn't connected yet.** The app says so instead of guessing. A detection service can be plugged into `src/extraction/extractor.ts`.
- **The demo closet is sample data.** Its 85 drawn garments, 32 outfits and wear history are bundled; the scan replays them, with simulated confidence scores.
- **The stylist is rule-based** and runs on the device, using your actual closet, not an AI model. `respond()` in `src/stylist/engine.ts` is where a model could be added.
- **There's no live weather.** The stylist uses the season, or weather words in your message.
- **Voice in Expo Go isn't available**, because Expo Go doesn't include speech recognition. Use keyboard dictation instead.
- **There are no accounts.** Data is per browser or device, and logout clears it.
