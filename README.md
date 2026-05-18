# getpotentiallead
GetPotentialLead Software solutions

## WhatsApp Bulk Messaging (Production)

Backend now supports real WhatsApp delivery via Twilio WhatsApp API and Meta WhatsApp Cloud API.

### 1) Configure backend environment

Copy `backend/.env.example` to `backend/.env` and set:

- `WHATSAPP_PROVIDER=twilio` (recommended for your current setup)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM` (example: `whatsapp:+14155238886`)

If using Meta directly instead:

- `WHATSAPP_PROVIDER=meta`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_API_VERSION` (default `v21.0`)

### 2) Start apps

- Backend: `cd backend && npm run dev`
- Frontend: `cd frontend && npm run dev`

### 3) Bulk message API

`POST /api/messages/bulk`

Send to all clients:

```json
{
  "mode": "all",
  "channel": "whatsapp",
  "message": "Hello from GetPotentialLead!"
}
```

Send to selected clients:

```json
{
  "mode": "selected",
  "channel": "whatsapp",
  "clientIds": ["CLIENT_ID_1", "CLIENT_ID_2"],
  "message": "Custom message for selected clients"
}
```

For business-initiated messaging outside the 24-hour user session window, pass an approved template:

```json
{
  "mode": "selected",
  "channel": "whatsapp",
  "clientIds": ["CLIENT_ID_1"],
  "templateName": "payment_reminder",
  "templateLanguageCode": "en"
}
```

Twilio Content Template send (matches your Twilio sample style):

```json
{
  "mode": "selected",
  "channel": "whatsapp",
  "clientIds": ["CLIENT_ID_1"],
  "contentSid": "HXb5b62575e6e4ff6129ad7c8efe1f983e",
  "contentVariables": {
    "1": "12/1",
    "2": "3pm"
  }
}
```
