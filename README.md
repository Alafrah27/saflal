# Saflal

Full source snapshot of the Saflal chat project, including the mobile application, Convex functions, retained legacy backend, admin application, bilingual website, assets, tests and migration/legal documentation.

| Directory | Contents |
| --- | --- |
| `mobile/` | React Native/Expo application, Clerk authentication, Convex functions, text and voice messages, Stream audio calls, assets, tests and scripts. |
| `backend/` | Retained Express/MongoDB/Socket.IO backend and its tests during the migration. |
| `admin/` | Existing Next.js admin/marketing application. |
| `frontend/` | English/Arabic React website and policy/about/deletion preview pages. |
| `docs/` | Architecture, migration progress, testing checklist, recovery report and legal drafts/audit. |

Install dependencies within each application directory using its own lockfile. The repository root does not provide a combined start/build command.

## Local setup

See [environment setup](docs/ENVIRONMENT_SETUP.md) before running the applications. Credentials, real environment files, Firebase project files and signing keys are intentionally excluded. Blank examples are provided for mobile, Convex server settings, legacy backend and website configuration. Configure your own services; do not commit their secrets.

```sh
cd mobile
npm ci
npm run start
```

The mobile app includes native calling/Firebase modules and requires an appropriately configured native development build for those features. Service configuration and a package installation alone do not establish production readiness. See the existing [mobile README](mobile/README.md) and [migration progress](docs/MIGRATION_PROGRESS.md).

For the website:

```sh
cd frontend
npm ci
npm run dev
```

Keep `docs/legal/` alongside `frontend/`: the website imports those documents. See [website setup](frontend/README.md).

## Verified checks for this snapshot

- Mobile: 460 existing tests passed with `node --test --test-isolation=none tests/*.test.mjs` from `mobile/`.
- Legacy backend: 16 tests passed with `node --experimental-vm-modules --test --test-isolation=none tests/*.test.mjs` from `backend/`.
- Website: lint, bilingual document rendering checks and `npm run build -- --configLoader native` passed.

These checks do not verify production deployments, all admin functionality, release builds or real-device incoming-call behavior. No production services or user data were migrated by this publication.

## Status

This is the current working-tree snapshot, including migration work. It is not a claim that the migration or Google Play release is complete. Legal pages remain review drafts; see [legal review notes](docs/legal/LEGAL_REVIEW_NOTES.md) before publication.

The Git history begins with a clean publication commit and intentionally excludes old histories containing tracked environment/dependency files. Installed dependencies, generated builds/native folders, temporary files and private credentials are not part of the source snapshot.
