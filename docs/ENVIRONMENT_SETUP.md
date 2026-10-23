# Saflal environment setup

This source snapshot intentionally omits private configuration and generated artifacts. It does not change the original development machine's secrets or provision any external service.

## Mobile application

Copy `mobile/.env.example` to a local `mobile/.env` and fill in the public Clerk publishable key and Convex URLs for your own environment. Set the Stream Android push-provider name to the provider configured for that environment. The Convex CLI may also use the `CONVEX_DEPLOYMENT` selector.

Server-only settings are listed without values in `mobile/convex/.env.example`. That file is a reference, not an automatically loaded server configuration file. Configure the actual values in the intended Convex deployment's environment. `HISTORY_LISTS_READY` is a migration readiness flag; follow the migration documentation and scripts rather than enabling it blindly.

Scripts also reference `CONVEX_DEPLOY_KEY` for deployment/verification workflows. Supply it only through the appropriate private local/CI environment when required. Do not put it or Clerk/Stream secrets into `EXPO_PUBLIC_*` settings, commit it, or embed it in the mobile binary.

Restore your own matching Firebase Android configuration to `mobile/google-services.json` when building the native app; `mobile/app.json` points to that path. Firebase server credentials, push-provider credentials, signing keys and any iOS configuration must be supplied privately through the relevant service/build workflow. The existing provider configuration scripts require operator-provided credentials and can change external settings; they were not executed as part of this GitHub push.

Install mobile dependencies using its own `package-lock.json` and included `.npmrc`. Native calling/Firebase dependencies require a compatible native build; source code alone is not a device verification.

## Retained legacy backend

Copy `backend/.env.example` to a local `backend/.env`. Configure the actual MongoDB, JWT and Cloudinary values only if running this retained legacy service. `API_URL` is referenced by its keep-alive job. No production database was copied into this repository.

The backend is preserved as it exists in the working tree. Follow the migration documentation for known limitations; this snapshot does not repair every legacy integration or establish that the old service is production-ready.

## Website and admin

The website's `frontend/.env.example` contains only a public optional APK URL. Leave it blank until an actual downloadable release is available. Website/legal pages are local preview content until separately deployed and approved.

No environment-variable names were found in the current first-party admin source. Install and run that application separately using its own package scripts; its production behavior was not validated for this publication.

## Excluded items

Real `.env` files, service-account JSON, Firebase project files, signing keys, installed `node_modules`, generated native folders and other build output, logs, temporary checkpoints, nested `.git` directories and prior Git histories were excluded. The production website build in `frontend/dist/` is intentionally included at the owner's request, alongside the source, lockfiles, application assets, tests and documentation. Keep credentials out of future commits too.
