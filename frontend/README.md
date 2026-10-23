# Saflal website

Responsive English/Arabic website using React, Vite, Tailwind CSS, React Router, and Lucide. Supplied app mockups are preserved. Privacy Policy, Terms of Service, About Saflal and account-deletion pages are connected to the repository's reviewed Markdown drafts in `docs/legal/`.

## Development

```sh
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

Routes: `/`, `/privacy`, `/terms`, `/about`, and `/delete-account`. `/privacy-policy` and `/terms-of-service` redirect to the corresponding pages. Unknown routes redirect to Home. A static host must serve `index.html` for navigation routes (SPA fallback), while assets and APK files continue to be served as files.

Netlify deployment is configured in the repository-root `netlify.toml`: install dependencies and run `npm run build` from `frontend`, then publish `frontend/dist`. This overrides the incorrect `npm run buid` command previously saved in the site settings. The existing `public/_redirects` supplies the SPA fallback for direct page visits and refreshes.

The production build in `frontend/dist/` is intentionally committed for deployment. Netlify regenerates it from source during deployment. For other static hosts, rebuild after source changes and publish the complete updated folder, including `index.html` and its matching hashed assets. This build uses root-relative asset URLs; hosting under a subdirectory requires an appropriate Vite base configuration and a new build.

Policy pages visibly retain their draft status and unresolved fields. Reviewer notes and the internal code audit are excluded from the rendered pages. Resolve the legal/operational items in `docs/legal/LEGAL_REVIEW_NOTES.md` before publication; adding these pages does not deploy the website or implement an external deletion-request processor.

## APK download

Copy `.env.example` to `.env.local`. Leave the value empty until the release is available: both calls to action display a disabled, localized “Download coming soon” button.

To enable downloads, set a public HTTPS direct download URL:

```dotenv
VITE_APK_DOWNLOAD_URL=https://your-domain.example/downloads/Saflal.apk
```

Or place a real APK at `public/downloads/Saflal.apk` and set `VITE_APK_DOWNLOAD_URL=/downloads/Saflal.apk`. Restart Vite after changing the value; rebuild for a published site. External hosting must serve the APK with appropriate download headers. APK creation, signing, and hosting are separate tasks. Invalid/unsupported URL values leave downloads unavailable. All `VITE_` variables are public; never add credentials.

## Language

Initial language: saved `saflal.website.language`, then browser Arabic, with English fallback. Switching updates navigation, all page content, document `lang`/`dir`, and page titles/descriptions without reloading. Policy/About/deletion copy loads from the matching English or `.ar.md` files in `docs/legal/`. Arabic uses right-to-left layout, localized contents/tables/draft notices, and isolated left-to-right contact details. Both legal-language versions remain review drafts and need qualified legal review before publication. Storage restrictions do not prevent switching. Screenshots remain as supplied. Home translations: `src/content.js`; initialization: `src/language.js`.

Typography uses Roboto for English and Cairo for Arabic, including language-switch labels. Both variable font families load through one Google Fonts CSS import with `display=swap`; local sans-serif fallbacks remain available while loading or offline.

## Verification

Inspect desktop/mobile in both languages, menu open/close/Escape, keyboard focus, policy contents anchors, internal policy links, refresh persistence, direct route loads/redirects, images, reduced motion, and unavailable/configured APK links. No backend, tracking, login, deployment or app-store listing is added.
