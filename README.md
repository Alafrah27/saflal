# Saflal website

English and Arabic website for the free Saflal chat application. Includes Home, Terms of Service, Privacy Policy, About Saflal and account-deletion draft pages.

## Run locally

```sh
cd frontend
npm ci
npm run dev
```

## Checks

```sh
cd frontend
npm run lint
npm run build -- --configLoader native
```

The website lives in `frontend/`. English and Arabic policy sources live in `docs/legal/`; they are imported at build time. Keep both directories when building. See [frontend setup](frontend/README.md) and [legal review notes](docs/legal/LEGAL_REVIEW_NOTES.md).

Legal pages remain review drafts with unresolved operator and operational details. This branch has not deployed a website or published an app-store listing.

This clean website branch excludes the mobile app, legacy backend, credentials, installed dependencies, build output and prior Git history. Audit references to mobile/backend source files describe the original development workspace; those files are not included in this branch.
