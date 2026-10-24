# Install on Samsung The Frame

[Guide français détaillé](INSTALL.fr.md)

Frame Home is a separate Tizen application. Keep a note of any native startup options you change. The original prototype ran on a 2022 LS03B / Tizen 6.5 / firmware 1720; this portable public build still needs hardware validation.

## Developer Mode

1. Put the TV and computer on the same local network. Identify the **computer's LAN address** and the **TV's address** separately.
2. Open Samsung Home → **Apps**, the application store.
3. Scroll to **App Settings** and open it.
4. Use the remote's **123** or **123/colour** button to display its number pad. Enter `12345` in App Settings, not in a search field.
5. Turn Developer Mode **On**. Enter the **computer's** address as Host PC IP. Save with OK.
6. Restart as the TV instructs; entering Art Mode is not a restart. Reopen Apps and check for the Develop Mode indication.

See [Samsung's device guide](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html) and its [device configuration instructions](https://github.com/Samsung/tizen-docs/blob/master/docs/application/flutter/guides/flutter-tizen/configure-device.md).

If the developer connection stays closed, the prototype recovered after saving Off, removing mains power for about 60 seconds, restarting, saving On with the correct Host PC IP, and performing a second full power cycle. This is an observed troubleshooting step, not a universal fix. With One Connect, use its mains power cord; do not disturb the thin display cable. Never interrupt a firmware update. Check local routing, VPN and guest-network isolation before changing security settings. No factory reset or service-menu change is required by this project.

## SDK and certificates

Install the [Samsung TV SDK and certificate tools](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html). The [VS Code certificate guide](https://developer.samsung.com/smarttv/develop/tools/additional-tools/vscode/creating-certificates.html) describes current Samsung certificate creation. Use your own Samsung account, author certificate and TV-specific distributor certificate. Permit installation in Device Manager if requested.

Do not publish certificates, passwords, DUIDs or signed personal packages. Keep the same author certificate for updates.

```sh
TV_HOST='YOUR_TV_IP'
sdb connect "$TV_HOST:26101"
sdb devices
python3 tools/build.py --public
mkdir -p local/signing
cp dist/Frame-Home-0.8.1-unsigned.wgt local/signing/FrameHome.wgt
tizen package -t wgt -s 'YOUR_CERTIFICATE_PROFILE' -- local/signing/FrameHome.wgt
```

Check the signed filename printed by the SDK, then use the exact device serial from `sdb devices`:

```sh
tizen install -s 'DEVICE_SERIAL_FROM_SDB' -n FrameHome.wgt -- local/signing
tizen run -s 'DEVICE_SERIAL_FROM_SDB' -p FrameHome1.FrameHome
```

These commands assume the signed file is `local/signing/FrameHome.wgt`; adapt that path if the SDK reports another output. [Samsung CLI reference](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/command-line-interface.html), [re-signing existing packages](https://docs.stg.tizen.org/application/tizen-studio/common-tools/command-line-interface/).

App ID: `FrameHome1.FrameHome`. Package: `FrameHome1`. Stop if that package already belongs to a different app/author. A certificate mismatch is not a reason to remove an unrelated application.

Use `python3 tools/build.py` without `--public` to include your local settings and imported images. `--public` always excludes them. No computer server is needed once the TV package is installed.

## Art Mode, resume and rollback

Test app launches, navigation and HDMI first. A short Power press should show the TV's normal artwork. Another short press should wake it. Frame Home changes no Art power or sensor settings.

For resume, note the original values, then try disabling **Start with Smart Hub Home** and enabling **Autorun Last App** in the TV's Start Screen Options. Put Frame Home in the foreground and test a complete Art-and-back cycle. This worked on the prototype, but support varies. [Samsung startup options](https://www.samsung.com/ae/support/tv-audio-video/use-autorun-start-screen-options-on-your-samsung-tv/).

Physical Home still opens Samsung. Short Back stays at the launcher root; long Exit remains native. To revert, use Home, remove only Frame Home in Apps → App Settings, restore the startup options you recorded, and disable Developer Mode if no longer needed. The firmware, streaming apps and Art collection have not been replaced.
