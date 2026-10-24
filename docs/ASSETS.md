# Assets, sources and licenses

The project code and original project assets are offered under [MIT](../LICENSE). Third-party files retain their own licenses. No Apple wallpaper, publisher app-logo pack, personal photograph, device inventory or signing material is distributed.

| Files | Origin | License / scope |
| --- | --- | --- |
| `app/assets/wallpapers/coast-*.jpg` | Original imagined coastal landscapes, generated for Frame Home with OpenAI imagegen; JPEG conversions and thumbnails | Original project assets, offered under MIT; AI-generated, no claim of exclusive copyright |
| `app/assets/demo/*.svg` | Original category icons and gradients drawn for the browser demo | MIT |
| `app/icon.png` | Original launcher icon drawn for Frame Home | MIT |
| `app/assets/fonts/inter.woff2` | [InterVariable v4.1, upstream](https://github.com/rsms/inter/tree/v4.1/docs/font-files) | [SIL OFL 1.1](../LICENSES/Inter-OFL.txt), © 2016 Inter Project Authors |
| `app/vendor/suncalc.js` | [SunCalc 1.9.0](https://github.com/mourner/suncalc/tree/v1.9.0) | [BSD 2-Clause](../LICENSES/SunCalc-BSD-2-Clause.txt), Vladimir Agafonkin |
| Tizen API integration examples | [Arn0 Launcher](https://github.com/NelsonEU/arn0-tv), reference commit `b35c292e5bc63648cb8fef576bf5eacd9ea488d1` | Upstream [MIT notice](../LICENSES/Arn0-MIT.txt), retained for adapted code |
| `docs/images/*.png` | Browser screenshots of this repository's fictional demo apps | Project UI and original project images; third-party font retains OFL |

The Arn0 license file preserves upstream text, including upstream asset notes. Those notes describe Arn0's assets, not this repository's inventory. Frame Home uses Inter with its correct upstream OFL notice; it does not ship the upstream Manrope font or Apple's aerial assets.

[Reframe](https://github.com/iampiny/reframe) and [CleanFrame](https://github.com/nthnclrk/CleanFrame) informed the investigation. Their private Home-remapping approaches and asset collections are not included.

## Native app logos

On a TV, the application catalogue and icon paths come from the installed apps through Tizen. Icons remain local to that TV and keep their publisher's rights. Their availability is not a redistribution license. The browser preview instead ships six fictional category icons; it does not copy a private household's app list.

For personal artwork you are authorized to use, see the [local importer](CUSTOMIZATION.md). Imports stay in ignored paths. A shared public build excludes them even when they are present on the build computer.

## Coast generation and preparation

Tool: built-in **OpenAI imagegen**, text-to-image, no reference images or personal photos supplied. These are imagined landscapes, not photographs of a named place and not reproductions of Apple wallpapers. The day and night images are separate compositions, not a camera-matched timelapse.

Both source images were 1672 × 941 pixels. The distributed JPEGs preserve that size, encoded at quality 90 with 4:4:4 chroma. Thumbnails fit within 532 × 300 at quality 84. Fresh RGB re-encoding omits EXIF and original source paths. Images were not upscaled and are not described as native 4K.

### Day prompt

```text
Use case: photorealistic-natural. Asset type: original royalty-free landscape wallpaper for an independent open-source television launcher. Generate a new original ultra-wide 16:9 cinematic aerial photograph of an uninhabited rugged coastal headland, blue-green Pacific-like ocean, smooth distant cliffs and mountain silhouettes, scattered sea stacks and a narrow winding coast. Soft clear morning light, restrained natural colors, quiet atmosphere. Composition: horizon in upper third, great depth, details concentrated toward upper two-thirds, calmer water in lower third for a TV app dock. Premium large-screen photographic quality with natural fine detail, no fake HDR. 3840x2160 landscape if possible. No recognizable landmarks, no bridge, no buildings, no people, no text, no logos, no watermark. This must be an original imagined landscape, not an Apple wallpaper or a reproduction of any specific existing image.
```

### Night prompt

```text
Use case: photorealistic-natural. Asset type: original royalty-free night landscape wallpaper for an independent open-source television launcher. Generate a new original ultra-wide 16:9 cinematic aerial photograph of an uninhabited rugged coastal headland, deep blue ocean, distant cliffs and mountain silhouettes, scattered sea stacks and a winding coast. Calm moonlit blue-hour night, a small moon above the horizon and faint natural stars, retain subtle visible rock and water detail rather than pure black. Quiet, elegant, photographic and understated. Composition: horizon in upper third, detailed coastal sweep in upper two-thirds, calm dark water in lower third for a TV app dock. Premium large-screen photographic quality, no fake HDR. 3840x2160 landscape if possible. No recognizable landmarks, no bridge, no buildings, no people, no text, no logos, no watermark. This must be an original imagined landscape, not an Apple wallpaper or a reproduction of any specific existing image.
```

The requested resolution in these prompts is a generation target; actual output dimensions are reported above. [Asset checksum manifest](assets-manifest.json) records the distributed binary/image files.

## Names and product identity

Apple, Apple TV and tvOS are trademarks of Apple Inc. Samsung and The Frame are trademarks of Samsung. Channel and application names belong to their publishers. This is an independent tvOS-inspired launcher for Samsung hardware, not an Apple or Samsung product. The included visual assets contain neither company's logo.
