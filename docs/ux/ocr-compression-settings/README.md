# OCR upload compression settings

## Profile reference

The percentage shown in the back office is a reference measurement from
Chapter 339. It is not a guaranteed reduction for every chapter.

| Profile | Phone preparation | Chapter 339 reduction | Status |
| --- | --- | ---: | --- |
| Original | Source upload, no compression | 0% | Bypass |
| Safe | 2000 px, WebP 75 | 44.7% | Validated |
| Balanced | 1600 px, WebP 70 | 57.8% | Experimental |
| Strong | 1400 px, WebP 50 | 69.7% | Experimental |
| Custom | 800–2400 px, WebP 40–90 | Variable | Experimental |

## Verification artifacts

- `backoffice-ocr-compression-profiles-final.png`: generated target.
- `backoffice-ocr-compression-settings-implementation-original.png`: real
  1920×1080 app capture with the full bypass selected.
- `backoffice-ocr-compression-settings-implementation-custom.png`: real
  1920×1080 app capture with the Custom panel open.
- `backoffice-ocr-compression-target-vs-implementation.png`: target and real
  implementation side by side.

The real-app verification covered:

- selecting Custom;
- deriving the master switch from the selected profile;
- switching off to select Original;
- switching back on to restore Custom;
- saving both Custom and Original;
- reloading and confirming Original persisted.

## Image generation prompt

Built-in ImageGen was used with the existing real Settings capture and the
previous Custom proposal as visual references.

```text
Use case: ui-mockup
Asset type: final implementation target PNG for an existing dark desktop
back-office Settings page

Create a polished 1920×1080 OCR upload compression settings screen that stays
visually close to the existing Nayovi back office: the same sidebar, LOCAL bar,
dark theme, typography, spacing and controls.

Show a phone-compression switch and five selectable profile cards:
Original — Bypass — 0% reduction — original upload, no recompression;
Safe — Validated — 44.7% reduction — 2000 px, WebP 75;
Balanced — Experimental — 57.8% reduction — 1600 px, WebP 70;
Strong — Experimental — 69.7% reduction — 1400 px, WebP 50;
Custom — Experimental — Variable — choose width and quality.

Open the selected Custom panel with maximum OCR width, WebP quality, output
format, preserved original-coordinate mapping, rollout controls and an
Original-upload fallback. State that reductions are references measured on
Chapter 339 and actual size varies by chapter. Do not imply a guaranteed final
file size.
```
