const express = require('express');
const Client = require('../models/Client');
const { buildTemplateMessage, sendAndLogMessage } = require('../services/messaging');

const router = express.Router();
const REMINDER_MESSAGE_CHANNEL = (process.env.REMINDER_MESSAGE_CHANNEL || 'whatsapp').toLowerCase();

const toSafeLimit = (value, fallback = 8) => {
  const n = Number(value);
  if (Number.isNaN(n) || n <= 0) return fallback;
  return Math.min(n, 50);
};

router.get('/summary', async (_req, res) => {
  const now = new Date();

  const [totalClients, pendingFollowUps, pendingPayments] = await Promise.all([
    Client.countDocuments({}),
    Client.countDocuments({ followUpDate: { $ne: null, $lte: now } }),
    Client.countDocuments({ paymentStatus: { $in: ['pending', 'overdue'] }, paymentDueAmount: { $gt: 0 } }),
  ]);

  res.json({ totalClients, pendingFollowUps, pendingPayments });
});

router.get('/follow-ups', async (req, res) => {
  const limit = toSafeLimit(req.query.limit, 8);
  const now = new Date();

  const items = await Client.find({ followUpDate: { $ne: null, $lte: now } })
    .sort({ followUpDate: 1, updatedAt: -1 })
    .limit(limit)
    .select('name phone email followUpDate tags paymentStatus')
    .lean();

  res.json(items);
});

router.get('/payments', async (req, res) => {
  const limit = toSafeLimit(req.query.limit, 8);

  const items = await Client.find({
    paymentStatus: { $in: ['pending', 'overdue'] },
    paymentDueAmount: { $gt: 0 },
  })
    .sort({ paymentDueDate: 1, updatedAt: -1 })
    .limit(limit)
    .select('name phone email paymentDueAmount paymentDueDate paymentStatus tags')
    .lean();

  res.json(items);
});

router.post('/follow-ups/send-reminders', async (req, res) => {
  const { clientIds = [] } = req.body;

  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return res.status(400).json({ message: 'clientIds is required' });
  }

  const clients = await Client.find({ _id: { $in: clientIds } });
  const now = new Date();

  const results = await Promise.allSettled(
    clients.map(async (client) => {
      await sendAndLogMessage({
        client,
        type: 'follow-up',
        channel: REMINDER_MESSAGE_CHANNEL,
        content: buildTemplateMessage(client, 'follow-up'),
      });

      await Client.updateOne({ _id: client._id }, { $set: { lastFollowUpAt: now } });
      return client._id;
    })
  );

  const sentCount = results.filter((r) => r.status === 'fulfilled').length;
  const failedCount = results.length - sentCount;
  const failedDetails = results
    .filter((r) => r.status === 'rejected')
    .map((r) => r.reason?.message || 'Unknown error')
    .slice(0, 20);

  res.json({ sentCount, failedCount, total: results.length, failedDetails });
});

router.post('/payments/send-reminders', async (req, res) => {
  const { clientIds = [] } = req.body;

  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return res.status(400).json({ message: 'clientIds is required' });
  }

  const clients = await Client.find({ _id: { $in: clientIds } });
  const now = new Date();

  const results = await Promise.allSettled(
    clients.map(async (client) => {
      await sendAndLogMessage({
        client,
        type: 'payment',
        channel: REMINDER_MESSAGE_CHANNEL,
        content: buildTemplateMessage(client, 'payment'),
      });

      const due = client.paymentDueDate ? new Date(client.paymentDueDate) : null;
      const nextStatus = due && due <= now ? 'overdue' : client.paymentStatus;
      await Client.updateOne(
        { _id: client._id },
        { $set: { lastPaymentReminderAt: now, paymentStatus: nextStatus } }
      );
      return client._id;
    })
  );

  const sentCount = results.filter((r) => r.status === 'fulfilled').length;
  const failedCount = results.length - sentCount;
  const failedDetails = results
    .filter((r) => r.status === 'rejected')
    .map((r) => r.reason?.message || 'Unknown error')
    .slice(0, 20);

  res.json({ sentCount, failedCount, total: results.length, failedDetails });
});

router.post('/follow-ups/snooze', async (req, res) => {
  const { clientId, days = 3 } = req.body;

  if (!clientId) {
    return res.status(400).json({ message: 'clientId is required' });
  }

  const snoozeDays = Math.max(1, Math.min(30, Number(days) || 3));
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + snoozeDays);

  const updated = await Client.findByIdAndUpdate(
    clientId,
    { $set: { followUpDate: nextDate } },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({ message: 'Client not found' });
  }

  res.json({ ok: true, followUpDate: updated.followUpDate });
});

router.post('/follow-ups/mark-complete', async (req, res) => {
  const { clientIds = [] } = req.body;

  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return res.status(400).json({ message: 'clientIds is required' });
  }

  const result = await Client.updateMany(
    { _id: { $in: clientIds } },
    { $set: { followUpDate: null, lastFollowUpAt: new Date() } }
  );

  res.json({ matchedCount: result.matchedCount || 0, modifiedCount: result.modifiedCount || 0 });
});

router.post('/payments/mark-paid', async (req, res) => {
  const { clientIds = [] } = req.body;

  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return res.status(400).json({ message: 'clientIds is required' });
  }

  const result = await Client.updateMany(
    { _id: { $in: clientIds } },
    {
      $set: {
        paymentStatus: 'paid',
        paymentDueAmount: 0,
        paymentDueDate: null,
      },
    }
  );

  res.json({ matchedCount: result.matchedCount || 0, modifiedCount: result.modifiedCount || 0 });
});

module.exports = router;
