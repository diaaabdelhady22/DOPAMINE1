
const { onRequest } = require('firebase-functions/v2/https');

const TELEGRAM_BOT_TOKEN = '8898859219:AAHFzHUWWmPpLlkmLqnbIKoak7-FvIaYiJI';

const TELEGRAM_CHAT_ID = '-5156450587';

exports.notifyTelegramRegistration = onRequest(
  {
    region: 'us-central1',
    cors: true
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method not allowed');
    }

    const { name, email, phone, parentPhone, userId } = req.body || {};

    if (![name, email, phone, parentPhone, userId].every(
      value => typeof value === 'string' && value.trim()
    )) {
      return res.status(400).json({
        ok: false,
        error: 'Missing registration fields'
      });
    }

    const message = [
      'NEW ACCOUNT REGISTRATION REQUEST',
      '',
      `Student Name: ${name}`,
      `Student Email: ${email}`,
      `Student Phone: ${phone}`,
      `Parent Phone: ${parentPhone}`,
      `Account ID: ${userId}`,
      'Status: Waiting for teacher verification'
    ].join('\n');

    try {
      const url =
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message
        })
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        console.error('Telegram error:', result);
        return res.status(502).json({
          ok: false,
          error: 'Telegram message failed'
        });
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Notification error:', error);
      return res.status(500).json({
        ok: false,
        error: 'Notification failed'
      });
    }
  }
);
