const mongoose = require('mongoose');

const messageLogSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    type: {
      type: String,
      enum: ['manual', 'birthday', 'anniversary', 'payment', 'follow-up'],
      required: true,
    },
    channel: { type: String, enum: ['sms', 'whatsapp', 'email'], default: 'sms' },
    content: { type: String, required: true },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MessageLog', messageLogSchema);
