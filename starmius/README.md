# Starmius Skincare

Next.js (App Router), TypeScript (strict), Tailwind CSS v4. Run with pnpm.

## Run

    pnpm install
    cp .env.example .env.local   # fill in values
    pnpm dev

## Architecture

    src/data/        EDIT HERE. All content and settings.
      products.ts    products, both prices, stock, images
      categories.ts  categories
      socials.ts     social links (add, remove, reorder)
      contact.ts     phone (PHONE constant), email, address, hours
      payments.ts    payment methods, USDC chains, receiving wallets
      checkout.ts    checkout form fields and status messages
      site.ts        brand name, nav, page copy, shipping, limits
    src/lib/         types, formatting, product queries, pricing, session
    src/components/  UI (reads only from data files)
    src/app/         routes and API (auth, Paystack)

## Common tasks

Add a product: copy a block in `src/data/products.ts`, give it a unique `slug`, set `categoryId`, `priceNGN`, `priceUSDC`, `stock`. Put images in `public/products` and list their paths.

Add a social: append an object to `src/data/socials.ts`. Icon keys: x, telegram, instagram, facebook, tiktok, whatsapp, youtube. New icon: add a key in `src/components/icons.tsx`.

Change contact details: edit `src/data/contact.ts`. The phone number lives in one constant, `PHONE`, and renders exactly as `+2347066100892` everywhere.

Edit page text: `src/data/site.ts`.

## Before going live

1. Replace sample products, email, and verify every social URL.
2. Set receiving wallets in `src/data/payments.ts` and re-check each USDC contract address.
3. Set `AUTH_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `PAYSTACK_SECRET_KEY` in `.env.local` (and on your host).
4. Google: create an OAuth Web client and add your site URL to Authorized JavaScript origins.
5. Paystack: add your site URL as callback; test with test keys first.

## Known limits (by design, to stay simple)

- No database: orders are not stored. Paystack keeps the record; USDC orders arrive via WhatsApp.
- USDC is confirmed manually by you from the transaction hash. Automated on-chain verification can be added in a new API route.
- Email sign in is passwordless and does not verify mailbox ownership. Add magic links or Auth.js when you need accounts with order history.
- Server totals are always recomputed from the data files, never trusted from the browser.
