const express = require('express');
const Client = require('../models/Client');
const { sendAndLogMessage } = require('../services/messaging');

const router = express.Router();

router.post('/bulk', async (req, res) => {
  const {
    message,
    clientIds = [],
    mode = 'all',
    channel = 'whatsapp',
    templateName,
    templateLanguageCode = 'en',
    contentSid,
    contentVariables,
  } = req.body;

  if ((!message || !message.trim()) && !templateName && !contentSid) {
    return res.status(400).json({ message: 'message, templateName, or contentSid is required' });
  }

  const filter = mode === 'selected' ? { _id: { $in: clientIds } } : {};
  const clients = await Client.find(filter);

  const results = await Promise.allSettled(
    clients.map((client) =>
      sendAndLogMessage({
        client,
        content: message || '',
        type: 'manual',
        channel,
        templateName,
        templateLanguageCode,
        contentSid,
        contentVariables,
      })
    )
  );

  const sentCount = results.filter((result) => result.status === 'fulfilled').length;
  const failedCount = results.length - sentCount;
  const failedDetails = results
    .filter((result) => result.status === 'rejected')
    .map((result) => result.reason?.message || 'Unknown error')
    .slice(0, 20);

  const responseBody = { sentCount, failedCount, total: results.length, failedDetails };

  if (sentCount === 0 && results.length > 0) {
    return res.status(502).json({
      ...responseBody,
      message: 'All WhatsApp deliveries failed. Check failedDetails.',
    });
  }

  if (failedCount > 0) {
    return res.status(207).json({
      ...responseBody,
      message: 'Partial delivery. Some WhatsApp messages failed.',
    });
  }

  return res.json(responseBody);
});

module.exports = router;
