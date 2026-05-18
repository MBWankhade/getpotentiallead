require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Client = require('../models/Client');

const parseDate = (value) => {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const mapCustomerToClient = (c) => {
  const paymentDueAmount = Number(c.pendingPayment || 0);
  const paymentDueDate = parseDate(c.paymentDueDate);
  const now = new Date();

  let paymentStatus = 'paid';
  if (paymentDueAmount > 0) {
    paymentStatus = paymentDueDate && paymentDueDate < now ? 'overdue' : 'pending';
  }

  const notesParts = [
    c.city ? `City: ${c.city}` : '',
    c.customerStatus ? `Customer Status: ${c.customerStatus}` : '',
    c.followUpStatus ? `Follow-up Status: ${c.followUpStatus}` : '',
    typeof c.whatsappOptIn === 'boolean' ? `WhatsApp Opt-In: ${c.whatsappOptIn ? 'Yes' : 'No'}` : '',
  ].filter(Boolean);

  return {
    name: c.name,
    phone: String(c.phone || '').trim(),
    email: c.email || '',
    tags: Array.isArray(c.tags) ? c.tags : [],
    notes: notesParts.join(' | '),
    followUpDate: parseDate(c.nextFollowUpDate),
    lastFollowUpAt: parseDate(c.lastFollowUpDate),
    birthday: parseDate(c.birthday),
    anniversary: parseDate(c.weddingAnniversary),
    paymentDueAmount,
    paymentDueDate,
    paymentStatus,
  };
};

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set');
  }

  const jsonPath = path.resolve(__dirname, '../../customers.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`customers.json not found at ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const customers = JSON.parse(raw);

  if (!Array.isArray(customers)) {
    throw new Error('customers.json must contain an array');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const ops = customers
    .map(mapCustomerToClient)
    .filter((c) => c.name && c.phone)
    .map((clientDoc) => ({
      updateOne: {
        filter: { phone: clientDoc.phone },
        update: { $set: clientDoc },
        upsert: true,
      },
    }));

  const result = await Client.bulkWrite(ops, { ordered: false });

  const total = await Client.countDocuments({});
  console.log('Import complete');
  console.log(`Processed: ${ops.length}`);
  console.log(`Inserted: ${result.upsertedCount || 0}`);
  console.log(`Modified: ${result.modifiedCount || 0}`);
  console.log(`Total clients in DB: ${total}`);

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Import failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch (_err) {}
  process.exit(1);
});
