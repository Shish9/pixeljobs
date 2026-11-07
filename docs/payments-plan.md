# Payment-provider integration plan (not live)

PixelJobs does not take payments today. The UI says so on the home page and in the footer.

## Foundations already in place
- `currencies` table + `src/lib/currency.ts`; all money will be stored as **integer minor units + ISO code**.
- `formatMoney()` with IQD (0 minor units) and USD.

## Proposed design (Phase 9+ / post-launch)
1. `payment_providers` (config, enabled flag) and a `PaymentProvider` TypeScript interface:
   `createCheckout(order) → redirectUrl`, `verifyWebhook(req) → event`, `refund(paymentId, amount)`.
2. `orders` (engagement, amount_minor, currency, status: `pending → paid → released | refunded | cancelled`) and
   `payments` (provider, provider_ref, status, raw event JSON). Writes only from server code using the service role,
   triggered by **signature-verified webhooks** — never from the client.
3. Candidate local providers to evaluate: FIB (First Iraqi Bank), ZainCash, FastPay, Qi Card / NassWallet; Stripe is
   not available for Iraqi merchants. Legal/licensing review is required before holding funds for others (escrow).
4. Until then, any "payment" step is labelled **"Arranged directly between client and freelancer"**.
