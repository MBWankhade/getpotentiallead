const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    city: { type: String, trim: true, default: '' },
    customerStatus: {
      type: String,
      enum: ['Interested', 'Converted', 'Inactive'],
      default: 'Interested',
    },
    followUpStatus: {
      type: String,
      enum: ['Pending', 'Completed'],
      default: 'Pending',
    },
    tags: [{ type: String, trim: true }],
    notes: { type: String, trim: true, default: '' },
    followUpDate: { type: Date },
    lastFollowUpAt: { type: Date },
    lastFollowUpDate: { type: Date },
    nextFollowUpDate: { type: Date },
    birthday: { type: Date },
    weddingAnniversary: { type: Date },
    anniversary: { type: Date },
    paymentDueAmount: { type: Number, default: 0 },
    paymentDueDate: { type: Date },
    lastBirthdayWishAt: { type: Date },
    lastAnniversaryWishAt: { type: Date },
    lastPaymentReminderAt: { type: Date },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Client', clientSchema);
