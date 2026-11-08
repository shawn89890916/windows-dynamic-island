# Independent plugin packages

Plugins are distributed as separate `.island-plugin.json` files. The desktop app downloads plugin code only after the user chooses to install it, shows a trust confirmation, and verifies the package SHA-256. Plugins run in the Dynamic Island WebView and can call host APIs; the hash detects download changes and does not sandbox code.

## Submit a community plugin

Anyone with a GitHub account can publish a plugin without write access to this repository:

1. Build and test a plugin package with `formatVersion: 1` and `manifest.sdkVersion: 1`.
2. Publish the package as a GitHub Release asset in a repository owned by your submitting GitHub account. Name it `<plugin-id>.island-plugin.json` and calculate the SHA-256 of that exact file.
3. Open a [Plugin market submission](https://github.com/shawn89890916/windows-dynamic-island/issues/new?template=plugin-submission.yml) issue and enter the release URL and SHA-256. Keep the `[Plugin Submission]` title prefix so the publisher can find it.
4. The workflow validates the package, copies it to the marketplace release, adds its manifest to the community catalogue, rebuilds the published catalogue, and closes the issue.

Valid submissions publish automatically without human review. Use a reverse-domain lowercase plugin ID, a new `MAJOR.MINOR.PATCH` version for every update, and an author URL matching your submitting account. Rejected submissions remain open; edit the issue after fixing the validation error to retry. Existing IDs can only be updated with a higher version. The workflow rejects malformed packages, mismatched hashes, duplicate IDs, unsupported SDK versions, oversized code, and packages hosted under another account.

## Built-in plugins

Changes to plugins bundled with the application still require a fork and pull request. Edit the widget under `src/core/plugins/widgets`, its metadata in `plugins/catalog.source.ts`, and its guide in `plugins/guides.ts`. The build entry map in `scripts/build-plugins.ts` connects each plugin ID to its widget. Increase that plugin's version when behavior changes.

Run `bun run plugins:build` to produce packages and the combined catalogue. A repository maintainer publishes built-in plugin changes with `scripts/publish-plugins.ps1`; ordinary contributors do not need to run that publisher.

## Runtime contract

A widget exports one React panel. Optional `Background` exports own persistent work such as timers and polling; it runs while the plugin is enabled and is cleaned up when disabled or removed. Optional `diagnose(settings)` returns a diagnostic result. Plugin settings and enablement are retained across package updates.
