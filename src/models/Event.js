const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  qrType: { type: String, enum: ['Individual', 'Category'], default: 'Individual' },
  isActive: { type: Boolean, default: true },
  volunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
