const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const Recipient = require('../models/Recipient');
const { cleanPhoneNumber } = require('../utils/phoneSanitizer');

const router = express.Router();

const MAIN_API_KEY = process.env.MAIN_API_KEY || '';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
const VALID_CATEGORIES = ['VIP', 'Donor', 'General'];

// Optional shared-secret guard for machine-to-machine calls.
// Only enforced when MAIN_API_KEY is set — leave it unset to keep open access.
router.use((req, res, next) => {
  if (MAIN_API_KEY && req.get('x-api-key') !== MAIN_API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
});

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

async function qrSvgDataUrl(content) {
  const svg = await QRCode.toString(content, { type: 'svg', margin: 1, width: 240 });
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * POST /api/recipients/claim
 * Find-or-create a recipient by phone (optionally scoped to an event) and
 * ensure it has a QR token. Returns the QR the venue gate will accept.
 * Used by the Seva Pass app when a devotee issues a pass to a known one.
 */
router.post('/claim', async (req, res) => {
  try {
    const { phone, name, category: rawCategory = 'General', eventId = null } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'phone is required' });
    if (!name) return res.status(400).json({ error: 'name is required' });

    const cleanPhone = cleanPhoneNumber(phone);
    if (!cleanPhone) return res.status(400).json({ error: 'Invalid phone number format' });

    const category = VALID_CATEGORIES.includes(rawCategory) ? rawCategory : 'General';
    const event = eventId || null;

    const existing = await Recipient.findOne({ phone: cleanPhone, eventId: event });
    const created = !existing;

    const recipient = await Recipient.findOneAndUpdate(
      { phone: cleanPhone, eventId: event },
      {
        $setOnInsert: { status: 'Pending' },
        $set: { name: name.trim(), category },
        $addToSet: { tags: { $each: ['SevaPass'] } },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (!recipient.qrToken) {
      recipient.qrToken = generateToken();
      await recipient.save();
    }

    const qrContent = recipient.qrToken;
    if (PUBLIC_BASE_URL) {
      recipient.qrImageUrl = `${PUBLIC_BASE_URL}/api/recipients/${recipient._id}/qr.png`;
      await recipient.save();
    }

    res.json({
      recipientId: recipient._id.toString(),
      name: recipient.name,
      phone: recipient.phone,
      category: recipient.category,
      qrToken: recipient.qrToken,
      qrContent,
      qrSvg: await qrSvgDataUrl(qrContent),
      isConsumed: recipient.isConsumed,
      created,
    });
  } catch (err) {
    console.error('[recipients] claim error:', err.message);
    res.status(500).json({ error: 'Failed to claim recipient' });
  }
});

/**
 * POST /api/recipients/consume
 * Mark a QR token as used at the venue gate (idempotent).
 * Called by the Seva Pass scanner so both systems agree on who entered.
 */
router.post('/consume', async (req, res) => {
  try {
    const { qrToken } = req.body || {};
    if (!qrToken) return res.status(400).json({ error: 'qrToken is required' });

    const recipient = await Recipient.findOne({ qrToken });
    if (!recipient) return res.status(404).json({ error: 'Recipient not found for this QR' });

    const alreadyConsumed = recipient.isConsumed;
    if (!alreadyConsumed) {
      recipient.isConsumed = true;
      recipient.consumedAt = new Date();
      await recipient.save();
    }

    res.json({
      recipientId: recipient._id.toString(),
      qrToken,
      isConsumed: true,
      alreadyConsumed,
    });
  } catch (err) {
    console.error('[recipients] consume error:', err.message);
    res.status(500).json({ error: 'Failed to consume recipient' });
  }
});

/**
 * GET /api/recipients/:id/qr.png
 * Serve the recipient's QR as a PNG (useful for WhatsApp delivery / hosting).
 */
router.get('/:id/qr.png', async (req, res) => {
  try {
    const recipient = await Recipient.findById(req.params.id);
    if (!recipient || !recipient.qrToken) {
      return res.status(404).json({ error: 'Recipient not found' });
    }
    const buf = await QRCode.toBuffer(recipient.qrToken, { type: 'png', margin: 1, width: 600 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="qr-${recipient.qrToken.slice(0, 8)}.png"`);
    res.send(buf);
  } catch (err) {
    console.error('[recipients] qr.png error:', err.message);
    res.status(500).json({ error: 'Failed to render QR' });
  }
});

module.exports = router;
