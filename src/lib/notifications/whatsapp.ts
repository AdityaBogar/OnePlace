import { NotificationResult } from './email';

export interface WhatsAppPayload {
  to: string; // phone number with country code e.g. +15550192834
  message: string;
  templateName?: string;
}

const provider = process.env.WHATSAPP_PROVIDER || 'mock';
const apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
const token = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

export async function sendWhatsAppNotification(payload: WhatsAppPayload): Promise<NotificationResult> {
  const summary = `WhatsApp to ${payload.to}: "${payload.message.substring(0, 60)}..."`;

  if (provider === 'mock' || !token || !phoneId) {
    console.log('[DEV MOCK WHATSAPP SERVICE] WhatsApp provider in mock mode or unconfigured keys. Simulating WhatsApp send:');
    console.log(`Recipient Phone: ${payload.to}`);
    console.log(`Message Body: ${payload.message}`);
    return {
      success: true,
      channel: 'WHATSAPP',
      status: 'MOCK_SENT',
      recipient: payload.to,
      summary,
    };
  }

  try {
    const url = `${apiUrl}/${phoneId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: payload.to.replace(/[^\d+]/g, ''), // clean phone number
        type: 'text',
        text: { body: payload.message },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`WhatsApp API HTTP ${response.status}: ${errText}`);
    }

    return {
      success: true,
      channel: 'WHATSAPP',
      status: 'SENT',
      recipient: payload.to,
      summary,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[WhatsApp Service Error]', errorMsg);
    return {
      success: false,
      channel: 'WHATSAPP',
      status: 'FAILED',
      recipient: payload.to,
      summary,
      error: errorMsg,
    };
  }
}
