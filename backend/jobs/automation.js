const Client = require('../models/Client');
const { buildTemplateMessage, sendAndLogMessage } = require('../services/messaging');
const AUTOMATION_MESSAGE_CHANNEL = (process.env.AUTOMATION_MESSAGE_CHANNEL || 'whatsapp').toLowerCase();

const isSameMonthDay = (dateA, dateB) => {
  if (!dateA || !dateB) return false;
  const a = new Date(dateA);
  const b = new Date(dateB);
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
};

const shouldSendToday = (lastSentAt) => {
  if (!lastSentAt) return true;
  const today = new Date();
  const last = new Date(lastSentAt);
  return today.toDateString() !== last.toDateString();
};

const runAutomationCycle = async () => {
  const clients = await Client.find({});
  const now = new Date();

  for (const client of clients) {
    try {
      if (isSameMonthDay(client.birthday, now) && shouldSendToday(client.lastBirthdayWishAt)) {
        await sendAndLogMessage({
          client,
          type: 'birthday',
          channel: AUTOMATION_MESSAGE_CHANNEL,
          content: buildTemplateMessage(client, 'birthday'),
        });
        client.lastBirthdayWishAt = now;
      }

      if (isSameMonthDay(client.anniversary, now) && shouldSendToday(client.lastAnniversaryWishAt)) {
        await sendAndLogMessage({
          client,
          type: 'anniversary',
          channel: AUTOMATION_MESSAGE_CHANNEL,
          content: buildTemplateMessage(client, 'anniversary'),
        });
        client.lastAnniversaryWishAt = now;
      }

      const due = client.paymentDueDate ? new Date(client.paymentDueDate) : null;
      const isPaymentPending = ['pending', 'overdue'].includes(client.paymentStatus);
      if (due && due <= now && isPaymentPending && shouldSendToday(client.lastPaymentReminderAt)) {
        await sendAndLogMessage({
          client,
          type: 'payment',
          channel: AUTOMATION_MESSAGE_CHANNEL,
          content: buildTemplateMessage(client, 'payment'),
        });
        client.lastPaymentReminderAt = now;
        client.paymentStatus = 'overdue';
      }

      if (client.followUpDate && new Date(client.followUpDate) <= now && shouldSendToday(client.lastFollowUpAt)) {
        await sendAndLogMessage({
          client,
          type: 'follow-up',
          channel: AUTOMATION_MESSAGE_CHANNEL,
          content: buildTemplateMessage(client, 'follow-up'),
        });
        client.lastFollowUpAt = now;
      }
    } catch (error) {
      console.error(`Automation send failed for ${client.phone}:`, error.message);
    }

    await client.save();
  }
};

const startAutomationJobs = () => {
  setInterval(async () => {
    try {
      await runAutomationCycle();
    } catch (error) {
      console.error('Automation cycle failed:', error.message);
    }
  }, 60 * 1000);
};

module.exports = { startAutomationJobs, runAutomationCycle };
