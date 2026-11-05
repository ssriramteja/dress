# crest

Digital wardrobe and conversational personal stylist. Expo SDK 58, React Native 0.88, TypeScript, Expo Router.

Three tabs: **closet** (light paper), **stylist** (black, chat), **you** (black). Onboarding runs coded intro → splash → explanation → photos or demo → scan → review → closet ready.

## Run it

```bash
npm install
npm run web          # dev server, opens the web app (keep it running)
npm run expo-go      # dev server + tunnel; scan the QR with Expo Go (keep it running)
npm run expo-go:lan  # same, phone on the same Wi-Fi, no tunnel
npm run build:web    # static web export → dist/
npm run serve:web    # serve dist/ on $PORT (default 8080), SPA fallback
npm run typecheck
npm run test:engine  # stylist engine checks
```

Expo Go must support **SDK 58**.

### Replit

`.replit` is included. **Run** executes `npm run replit`, which builds the web export and serves it on port 8080. It needs no dev server, so the preview URL works on its own. For Expo Go from Replit, run `npm run expo-go` in the Shell. The QR code only works while that process is running.

### Free hosting

- **GitHub Pages:** `.github/workflows/pages.yml` builds and deploys on every push to `main`, at `https://<user>.github.io/<repo>/`. Turn it on once under repo **Settings → Pages → Source: GitHub Actions**. Free accounts need a public repo; paid plans allow private.
- **Netlify** (keeps the repo private): `netlify.toml` is included. At netlify.com choose *Add new site → Import from Git* and pick this repo; it deploys on every push.

`app.config.js` reads `EXPO_BASE_URL` so sub-path hosts work, while local dev, Expo Go and Netlify still serve from the root.

## Layout

```
src/app/                 routes: onboarding, (tabs)/closet|stylist|you, root layout
src/storage/             types, persisted store (AsyncStorage), utils
src/catalog/             demo catalog (deterministic) + vector garment renderer
src/extraction/          garment extraction: demo path + real-photo path + dedupe
src/stylist/             rule-based stylist engine (+ tests)
src/components/          UI: tiles, look card, garment sheet, pile, tab bar, icons
src/onboarding/          intro, splash, steps
src/hooks/               reduced motion, shake, voice
scripts/serve.mjs        static server for the web export
```

## Demo-only and not yet connected

These are deliberately not presented as production features:

- **Garment extraction from real photos is not connected.** `extractFromPhotos` returns `unavailable` and the app says so. It never invents detections. Users can tag a single-piece photo by category, and it's added as-is, labelled "not cut out". To make this real, plug a segmentation/detection service (for example a vision model returning masks per garment) into `src/extraction/extractor.ts` and feed its output through the existing `dedupe()`.
- **The demo closet is bundled sample data.** It has 85 vector-drawn garments, 32 outfit boards and a deterministic wear history. Its "scan" replays the boards' known contents, and the confidence scores are simulated so the review step has pieces to check. It's labelled "demo scan · bundled sample outfits" throughout.
- **The original crest assets weren't available.** The 188-item catalog, outfit boards, menswear photos and logo files weren't in this workspace, so this build uses procedurally drawn garments and a typeset wordmark/icon. Swap in real cutouts by giving garments `image: { type: 'photo', uri }` (transparent PNGs), or extend `GarmentArt`.
- **The stylist is rule-based and runs on-device**, with no LLM. It handles occasions, anchors, follow-ups, clarification, unworn pieces, similar pieces and packing, all grounded in the closet. `respond()` in `src/stylist/engine.ts` is the seam for a model-backed stylist.
- **There's no live weather.** The stylist uses weather words from the message, otherwise a seasonal assumption, and says so.
- **Voice** uses the Web Speech API on web. Expo Go has no speech-recognition module, so on native the mic explains this and points to keyboard dictation, which feeds the same chat. Native voice needs a development build with a speech-recognition module.
- **Logout** clears local data. There's no account backend.
