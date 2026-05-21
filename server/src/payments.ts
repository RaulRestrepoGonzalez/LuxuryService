import crypto from 'crypto';

const MERCHANT_ID = process.env.CREDIBANCO_MERCHANT_ID || '';
const API_KEY = process.env.CREDIBANCO_API_KEY || '';
const API_URL = process.env.CREDIBANCO_API_URL || 'https://api.credibanco.com/checkout/v1/sessions';
const WEBHOOK_SECRET = process.env.CREDIBANCO_WEBHOOK_SECRET || '';

export interface CheckoutSession {
  sessionId: string;
  checkoutUrl: string;
  reference: string;
}

export interface WebhookPayload {
  reference: string;
  status: 'APPROVED' | 'DECLINED' | 'PENDING';
  transactionId?: string;
  signature?: string;
  amount?: number;
}

function generateReference(): string {
  return `LS-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function verifySignature(payload: WebhookPayload): boolean {
  if (!WEBHOOK_SECRET || !payload.signature) return false;
  const data = `${payload.reference}|${payload.status}|${payload.transactionId || ''}|${payload.amount || 0}`;
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(data).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(payload.signature));
}

export async function createCheckout(params: {
  amount: number;
  description: string;
  returnUrl: string;
  webhookUrl: string;
  customerEmail: string;
}): Promise<CheckoutSession> {
  const reference = generateReference();

  if (!MERCHANT_ID || !API_KEY) {
    const sessionId = `sim-${Date.now()}`;
    return {
      sessionId,
      checkoutUrl: `${params.returnUrl}?ref=${reference}&sim=true`,
      reference
    };
  }

  const body = {
    merchantId: MERCHANT_ID,
    reference,
    description: params.description,
    amount: Math.round(params.amount),
    currency: 'COP',
    returnUrl: params.returnUrl,
    webhookUrl: params.webhookUrl,
    customerEmail: params.customerEmail
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Credibanco error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return { sessionId: data.sessionId, checkoutUrl: data.checkoutUrl, reference };
}

export function processWebhook(body: any): { valid: boolean; payload: WebhookPayload | null } {
  if (!body || !body.reference || !body.status) return { valid: false, payload: null };

  const payload: WebhookPayload = {
    reference: body.reference,
    status: body.status,
    transactionId: body.transactionId,
    signature: body.signature,
    amount: body.amount,
  };

  if (WEBHOOK_SECRET && payload.signature) {
    const valid = verifySignature(payload);
    if (!valid) return { valid: false, payload: null };
  }

  return { valid: true, payload };
}
