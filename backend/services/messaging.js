const MessageLog = require('../models/MessageLog');

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PROVIDER = (process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase();
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;
const TWILIO_DEFAULT_COUNTRY_CODE = process.env.TWILIO_DEFAULT_COUNTRY_CODE || '+91';

const getTwilioClient = () => {
  let twilioFactory;
  try {
    // Lazy-load so server does not crash on startup if package is missing.
    twilioFactory = require('twilio');
  } catch (_error) {
    throw new Error("Twilio SDK not installed. Run 'cd backend && npm install twilio'");
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio config is missing: TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN');
  }
  return twilioFactory(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
};

const normalizeToWhatsappAddress = (phone) => {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  if (raw.startsWith('whatsapp:')) return raw;

  const onlyDigits = raw.replace(/\D/g, '');
  if (!onlyDigits) return '';

  // If user saves local numbers like 08788581876, convert them to E.164 with default country code.
  const localDigits = onlyDigits.replace(/^0+/, '');
  const needsCountryCode = localDigits.length === 10;
  const e164 = needsCountryCode
    ? `${TWILIO_DEFAULT_COUNTRY_CODE}${localDigits}`
    : raw.startsWith('+')
      ? `+${onlyDigits}`
      : `+${localDigits}`;

  return `whatsapp:${e164}`;
};

const buildTemplateMessage = (client, templateType) => {
  if (templateType === 'birthday') {
    return `Happy Birthday ${client.name}! Wishing you a fantastic year ahead.`;
  }
  if (templateType === 'anniversary') {
    return `Happy Wedding Anniversary ${client.name}! Wishing you joy and togetherness.`;
  }
  if (templateType === 'payment') {
    const amount = Number(client.paymentDueAmount || 0).toFixed(2);
    const dueDate = client.paymentDueDate
      ? new Date(client.paymentDueDate).toLocaleDateString('en-IN')
      : 'today';
    return `Hi ${client.name}, this is a reminder that payment of INR ${amount} is due on ${dueDate}.`;
  }
  if (templateType === 'follow-up') {
    return `Hi ${client.name}, just checking in regarding your previous inquiry. Let us know how we can help.`;
  }
  return `Hi ${client.name}, thank you for staying connected with us.`;
};

const sendAndLogMessage = async ({
  client,
  content,
  type,
  channel = 'sms',
  templateName,
  templateLanguageCode = 'en',
  contentSid,
  contentVariables,
}) => {
  let status = 'sent';
  let failureReason = '';

  try {
    if (channel === 'whatsapp') {
      if (WHATSAPP_PROVIDER === 'twilio') {
        if (!TWILIO_WHATSAPP_FROM) {
          throw new Error('Twilio config is missing: TWILIO_WHATSAPP_FROM');
        }

        const to = normalizeToWhatsappAddress(client.phone);
        if (!to) {
          throw new Error(`Invalid client phone number: ${client.phone}`);
        }

        const twilioClient = getTwilioClient();
        const messagePayload = {
          from: TWILIO_WHATSAPP_FROM,
          to,
        };

        if (contentSid) {
          messagePayload.contentSid = contentSid;
          if (contentVariables && typeof contentVariables === 'object') {
            messagePayload.contentVariables = JSON.stringify(contentVariables);
          }
        } else {
          messagePayload.body = content;
        }

        await twilioClient.messages.create(messagePayload);
      } else if (WHATSAPP_PROVIDER === 'meta') {
        if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
          throw new Error(
            'Meta WhatsApp config is missing: WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN. ' +
              'If you use Twilio, set WHATSAPP_PROVIDER=twilio.'
          );
        }

        const normalizedTo = String(client.phone || '').replace(/\D/g, '');
        if (!normalizedTo) {
          throw new Error(`Invalid client phone number: ${client.phone}`);
        }

        const payload = templateName
          ? {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: normalizedTo,
              type: 'template',
              template: {
                name: templateName,
                language: { code: templateLanguageCode },
              },
            }
          : {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: normalizedTo,
              type: 'text',
              text: { preview_url: false, body: content },
            };

        const response = await fetch(
          `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          const errorPayload = await response.text();
          throw new Error(`WhatsApp API error ${response.status}: ${errorPayload}`);
        }
      } else {
        throw new Error(`Unsupported WHATSAPP_PROVIDER: ${WHATSAPP_PROVIDER}`);
      }
    } else {
      console.log(`[MockSend] ${channel.toUpperCase()} to ${client.phone}: ${content}`);
    }
  } catch (error) {
    status = 'failed';
    failureReason = error.message;
    console.error(`Message send failed for ${client.phone}: ${error.message}`);
  }

  const log = await MessageLog.create({
    clientId: client._id,
    type,
    channel,
    content,
    status,
  });

  if (status === 'failed') {
    throw new Error(`Message delivery failed for ${client.phone}: ${failureReason || 'unknown error'}`);
  }

  return log;
};

module.exports = {
  buildTemplateMessage,
  sendAndLogMessage,
};
