# Localization & RTL

| Code | Language | Script / dir | `Intl` locale | Notes |
| --- | --- | --- | --- | --- |
| `en` | English | Latin / LTR | `en-IQ` | Source dictionary |
| `ar` | Arabic | Arabic / RTL | `ar-IQ` | Arabic-Indic digits, Iraqi month names |
| `ckb` | Kurdish — Sorani | Arabic / RTL | `ckb-IQ` | Full ICU support |
| `kmr` | Kurdish — Badini (Kurmanji, Duhok) | Arabic / RTL | `ckb-IQ` (fallback) | ICU has no Arabic-script Kurmanji; numbers/dates use Sorani data |

- URLs are prefixed (`/ckb/settings`). The proxy picks a locale from the `pj_locale` cookie, then `Accept-Language`.
- Dictionaries: `src/i18n/dictionaries/*.ts`. `en.ts` defines the `Dictionary` type, so a missing key in another
  language is a **type error**; a unit test also checks keys and `{placeholder}` parity.
- Server Components load dictionaries with `getDictionary(locale)`; client forms receive only the sections they need.
- Formatting: server components use `getFormatters(locale)` (`src/i18n/format-server.ts`) → `fmt.number`, `fmt.date`,
  `fmt.money`, which respect the visitor's **digit style**: Arabic-Indic (١٢٣, default for ar/ckb/kmr) or Western (123).
  The choice lives in Settings → Preferences, is saved in `account_settings.digit_style`, and is mirrored in the
  `pj_digits` cookie (restored on sign-in) so every page can read it. Time zone is always `Asia/Baghdad`.
- **One language per screen.** Pages never mix languages in their UI copy; only the language menu lists languages in
  their own scripts. User-generated content may be in any language (`dir="auto"`).
- **Font:** Noto Naskh Arabic for Arabic and Kurdish (chosen in design review), Plus Jakarta Sans for Latin. Naskh reads
  smaller than Latin, so RTL pages set the root size to 109.375% (all rem sizes scale: `text-sm` ≈ 15.3px,
  `text-xs` ≈ 13.1px) and body line-height 1.85. Keep Kurdish/Arabic UI text at `text-sm` or larger.
- RTL: `<html dir>` is set server-side. Use logical Tailwind utilities (`ms-*`, `pe-*`, `start-*`, `text-start`),
  `rtl:-scale-x-100` for directional icons, `dir="ltr"` on email/password/username inputs, and `.ltr-isolate` for
  Latin tokens in RTL text. User-generated text uses `dir="auto"`.

**Translation review:** Arabic and Sorani strings are production drafts; **Badini strings are a first draft and must be
reviewed by a native Duhok speaker** before launch.

Adding a language: add it to `locales`/`localeMeta` in `src/i18n/config.ts`, add a dictionary, add it to the
`locale_code` enum (migration) and to `handle_new_user()`.
