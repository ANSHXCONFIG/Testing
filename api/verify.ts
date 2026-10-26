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
  const utr = typeof req.body?.utr === 'string' ? req.body.utr.trim() : undefined;
  const txnid = typeof req.body?.txnid === 'string' ? req.body.txnid.trim() : undefined;

  if (rawAmount === undefined || rawAmount === null || rawAmount === '' ||
      !Number.isFinite(amount) || amount <= 0 || amount > 100000) {
    return res.status(400).json({ ok: false, error: 'amount must be a positive number not exceeding 100000' });
  }
  if (utr && !/^\d{12}$/.test(utr)) {
    return res.status(400).json({ ok: false, error: 'utr must contain exactly 12 digits' });
  }
  if (txnid && !/^[a-zA-Z0-9-]{4,64}$/.test(txnid)) {
    return res.status(400).json({ ok: false, error: 'txnid format is invalid' });
  }

  try {
    const verifier = new FamPayVerifier({
      gmail: process.env.GMAIL || '',
      gmailAppPassword: process.env.GMAIL_APP_PASSWORD || ''
    });
    const result = await verifier.verifyPayment({
      amount: amount.toFixed(2),
      ...(utr ? { utr } : {}),
      ...(txnid ? { txnid } : {})
    });
    if (!result.verified) {
      const notFound = result.message === 'Transaction not found';
      return res.status(notFound ? 200 : 502).json({
        ok: true,
        verified: false,
        message: notFound ? 'Matching payment was not found in Gmail alerts' : (result.message || 'Verification could not be completed')
      });
    }
    return res.status(200).json({ ok: true, ...result });
  } catch {
    return res.status(500).json({ ok: false, error: 'Payment verification failed; check server configuration' });
  }
}
