import { FamPayVerifier } from '../src/index.js';

function authorized(req: any): boolean {
  const secret = process.env.API_SECRET;
  const supplied = req.headers['x-api-key'];
  return Boolean(secret && typeof supplied === 'string' && supplied === secret);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!authorized(req)) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const rawAmount = req.body?.amount;
  const amount = Number(rawAmount);
  const upiId = process.env.UPI_ID;
  const name = process.env.UPI_NAME;
  if (!upiId || !name) return res.status(500).json({ ok: false, error: 'Merchant configuration is missing' });
  if (rawAmount === undefined || rawAmount === null || rawAmount === '' ||
      !Number.isFinite(amount) || amount <= 0 || amount > 100000 ||
      !/^\d+(\.\d{1,2})?$/.test(String(rawAmount))) {
    return res.status(400).json({ ok: false, error: 'amount must be positive, at most 100000, with up to 2 decimal places' });
  }

  try {
    const verifier = new FamPayVerifier({
      gmail: process.env.GMAIL || '',
      gmailAppPassword: process.env.GMAIL_APP_PASSWORD || ''
    });
    const result = await verifier.generateQr({ upiId, amount: amount.toFixed(2), name });
    return res.status(200).json({ ok: true, ...result });
  } catch {
    return res.status(500).json({ ok: false, error: 'Could not generate payment QR; check server configuration' });
  }
}
