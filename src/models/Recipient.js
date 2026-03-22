const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: false }, // Made false for initial testing
  name: { type: String, required: true },
  phone: { type: String, required: true },
  category: { type: String, enum: ['VIP', 'Donor', 'General'], default: 'General' },
  tags: [{ type: String }],
  status: { type: String, enum: ['Pending', 'Queued', 'Sent', 'Failed'], default: 'Pending' },
  qrToken: { type: String, unique: true, sparse: true },
  qrImageUrl: { type: String },
  isConsumed: { type: Boolean, default: false },
  consumedAt: { type: Date }
}, { timestamps: true });

// Prevent duplicate phone numbers per event
recipientSchema.index({ eventId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Recipient', recipientSchema);
