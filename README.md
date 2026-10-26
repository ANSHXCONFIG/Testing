# FamPay Verify API (Vercel)

This is an API-only Vercel project. The incomplete React frontend from the original ZIP has been removed.

## Endpoints

- `GET /api/health` — deployment health check.
- `POST /api/qr` — generate a UPI QR for the configured merchant.
- `POST /api/verify` — check Gmail alerts for a matching amount and optional UTR/transaction ID.

All POST endpoints require `x-api-key` to match `API_SECRET`.

## Environment variables

Set in Vercel → Project → Settings → Environment Variables:

- `GMAIL`
- `GMAIL_APP_PASSWORD` (Google App Password, not your normal Google password)
- `API_SECRET` (long random secret; keep private)
- `UPI_ID`
- `UPI_NAME`

Do not put secrets in frontend code, and do not commit `.env.local`.

## Local setup

1. Install Node.js 20 or later.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in values.
4. Run `npx vercel dev`.
5. Test using curl or Postman.

## Example requests

Health:
```bash
curl http://localhost:3000/api/health
```

Generate QR:
```bash
curl -X POST http://localhost:3000/api/qr \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: YOUR_API_SECRET' \
  -d '{"amount":"25.50"}'
```

Verify:
```bash
curl -X POST http://localhost:3000/api/verify \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: YOUR_API_SECRET' \
  -d '{"amount":"25.50"}'
```

Optional UTR body: `{"amount":"25.50","utr":"123456789012"}`.

## Important limitations

Gmail alert matching is not equivalent to bank/UPI-provider confirmation. The bundled verifier is a best-effort email parser and can miss alerts or misread message content. Do not release goods or credit a wallet solely on this response. For real-money production flows, use an authorized payment provider's signed server webhook/API. This API currently has no persistent database-backed replay protection.
