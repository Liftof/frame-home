# Contributing

Small, focused improvements are welcome. This project aims for a calm tvOS-inspired interface on Samsung The Frame, with public APIs and reversible installation.

## Development

```sh
python3 tools/preview.py
node --test tests/*.test.cjs
python3 -m pip install -r requirements-tools.txt
python3 -m unittest discover -s tests -p 'test_*.py'
python3 tools/check_public.py
python3 tools/build.py --public
```

Python 3.10+ and Node 18+ are required for these checks. Pillow is optional at runtime; the image-import tests use it. No JavaScript dependency installation is needed.

Keep browser code compatible with the Tizen 6.5 target. Prefer simple JavaScript, explicit lifecycle cleanup, existing DOM nodes and local assets. Avoid expensive filters, permanent animations and changes that require a server after installation.

Verify UI changes with the remote-style keyboard path as well as a screenshot: Home, Apps, options, pin/unpin, move, settings, Live TV and Back. Test interrupted long presses and visibility changes when relevant. Do not invent playback history or claim an app/channel launched solely because the API accepted a request.

Hardware reports must distinguish the exact public commit tested from the older prototype. Check short Power → Art → resume, installed app launching and HDMI changes on your own TV. Preserve initial startup settings so they can be restored. Never include private identifiers, raw logs, signing material or photos containing personal information.

## Assets and licensing

Use original assets or provide a verifiable redistribution license. Do not add Apple wallpapers, app-store artwork, brand logos or downloaded images based only on their availability online. Native app icons are read from the TV, not committed here. See [asset provenance](docs/ASSETS.md).

Contributions are under the repository's MIT license unless a file explicitly states another compatible license. Retain upstream notices. Keep private configuration and imported images in the ignored local paths, and review the staged diff before opening a pull request.
