const express = require('express');
const Client = require('../models/Client');

const router = express.Router();

router.get('/', async (req, res) => {
  const { q = '', paymentStatus = 'all', tag = 'all', followUpState = 'all' } = req.query;
  const search = q.trim();

  const filter = search
    ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }
    : {};

  if (paymentStatus !== 'all') {
    filter.paymentStatus = paymentStatus;
  }

  if (tag !== 'all') {
    filter.tags = tag;
  }

  if (followUpState !== 'all') {
    const now = new Date();
    if (followUpState === 'due') {
      filter.followUpDate = { $lte: now };
    } else if (followUpState === 'upcoming') {
      filter.followUpDate = { $gt: now };
    } else if (followUpState === 'none') {
      filter.followUpDate = null;
    }
  }

  const clients = await Client.find(filter).sort({ createdAt: -1 });
  res.json(clients);
});

router.post('/', async (req, res) => {
  const client = await Client.create(req.body);
  res.status(201).json(client);
});

router.post('/bulk-update', async (req, res) => {
  const { clientIds = [], update = {} } = req.body;

  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return res.status(400).json({ message: 'clientIds is required' });
  }

  const allowedFields = [
    'name',
    'phone',
    'email',
    'tags',
    'notes',
    'followUpDate',
    'lastFollowUpAt',
    'birthday',
    'anniversary',
    'paymentDueAmount',
    'paymentDueDate',
    'paymentStatus',
  ];

  const safeUpdate = Object.fromEntries(
    Object.entries(update).filter(([key]) => allowedFields.includes(key))
  );

  if (Object.keys(safeUpdate).length === 0) {
    return res.status(400).json({ message: 'No valid update fields provided' });
  }

  const result = await Client.updateMany(
    { _id: { $in: clientIds } },
    { $set: safeUpdate },
    { runValidators: true }
  );

  return res.json({
    matchedCount: result.matchedCount || 0,
    modifiedCount: result.modifiedCount || 0,
  });
});

router.post('/bulk-delete', async (req, res) => {
  const { clientIds = [] } = req.body;

  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return res.status(400).json({ message: 'clientIds is required' });
  }

  const result = await Client.deleteMany({ _id: { $in: clientIds } });
  return res.json({ deletedCount: result.deletedCount || 0 });
});

router.put('/:id', async (req, res) => {
  const client = await Client.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!client) {
    return res.status(404).json({ message: 'Client not found' });
  }

  return res.json(client);
});

router.delete('/:id', async (req, res) => {
  const client = await Client.findByIdAndDelete(req.params.id);
  if (!client) {
    return res.status(404).json({ message: 'Client not found' });
  }
  return res.status(204).send();
});

module.exports = router;
