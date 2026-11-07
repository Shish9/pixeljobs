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
- Formatting: `formatMoney(amountMinor, currency, locale)`, `formatNumber`, `formatDate` (time zone `Asia/Baghdad`).
- RTL: `<html dir>` is set server-side. Use logical Tailwind utilities (`ms-*`, `pe-*`, `start-*`, `text-start`),
  `rtl:-scale-x-100` for directional icons, `dir="ltr"` on email/password/username inputs, and `.ltr-isolate` for
  Latin tokens in RTL text. User-generated text uses `dir="auto"`.

**Translation review:** Arabic and Sorani strings are production drafts; **Badini strings are a first draft and must be
reviewed by a native Duhok speaker** before launch.

Adding a language: add it to `locales`/`localeMeta` in `src/i18n/config.ts`, add a dictionary, add it to the
`locale_code` enum (migration) and to `handle_new_user()`.
