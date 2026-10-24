# Security and privacy

Frame Home runs locally. It has no project account, telemetry endpoint, remote control server or background relaunch service. Installed streaming apps and Samsung services have their own privacy policies; installing this launcher does not disable their tracking or remove their advertising.

## Keep these files private

- Samsung author/distributor certificates, passwords and signing profiles.
- TV identifiers, device inventory, network addresses, remote-control tokens and raw SDK logs.
- `local/`, `app/assets/local/`, signed WGT packages and personal screenshots.

The repository ignores these paths and common credential formats. `python3 tools/check_public.py` checks tracked files for forbidden artifacts and selected secret patterns without printing matched contents. It cannot identify every secret, personal image or licensing problem. Review your staged diff and images before publishing. Use a GitHub no-reply commit address if you do not want to publish your email.

`python3 tools/build.py --public` always excludes local settings and imported media. A regular build intentionally embeds your local settings and assets for your own TV. **Neither command signs the package. Do not share a personally signed WGT or certificate.**

The preview binds only to `127.0.0.1`. Do not expose the SDK connection, developer ports or preview through internet port forwarding. Use your own trusted network and disable Developer Mode when you no longer need it. Keep a secure backup of your author certificate if you want to update your installation with the same signing identity.

## Reports

For a UI or compatibility issue, share the TV model family, year, Tizen/app version, a redacted description and the smallest reproducible steps. Do not post raw device logs, DUIDs, IP/MAC addresses, accounts or certificates in a public issue.

For a security vulnerability, use GitHub private vulnerability reporting **if it is available on the repository**. If unavailable, open a minimal issue requesting a private reporting route, without exploit details or private information. No personal contact address is distributed with this project.

## Supported scope

This experimental release does not replace Samsung's security model or promise compatibility with every firmware. Changes requiring root, private native APIs, credential sharing or disabling system protections are outside the shipped implementation. See [compatibility](docs/COMPATIBILITY.md) and the [installation/rollback guide](docs/INSTALL.fr.md).
