---
name: New Email Provider
about: Request support for a new email provider
title: '[PROVIDER] Add support for [Provider Name]'
labels: provider, enhancement
assignees: ''
---

## Provider Information
- **Provider Name**: [e.g. Postmark, Resend, Amazon Pinpoint]
- **Provider Website**: [e.g. https://postmarkapp.com]
- **API Documentation**: [Link to API docs]

## Why This Provider?
Explain why this provider should be added to CourierX:
- [ ] Better deliverability for certain regions
- [ ] Lower cost
- [ ] Specific features needed
- [ ] Compliance requirements
- [ ] Other: ___________

## Provider Features
What features does this provider support?
- [ ] Transactional emails
- [ ] Bulk emails
- [ ] Templates
- [ ] Webhooks
- [ ] Attachments
- [ ] Custom headers
- [ ] Tracking (opens, clicks)
- [ ] Bounce handling
- [ ] Suppression lists

## API Details
If you're familiar with the provider's API:

**Authentication Method**:
- [ ] API Key
- [ ] OAuth
- [ ] Basic Auth
- [ ] Other: ___________

**Send Endpoint**: [e.g. POST https://api.provider.com/v1/send]

**Rate Limits**: [e.g. 100 requests/minute]

**Webhook Support**: 
- [ ] Yes
- [ ] No
- [ ] Unknown

## Implementation Offer
- [ ] I can help implement this provider
- [ ] I can provide testing credentials
- [ ] I can help with documentation
- [ ] I just need this provider

## Additional Context
Add any other context about the provider request here.

## Sample API Request/Response
If available, provide a sample API request and response:

```json
// Request
{
  "to": "user@example.com",
  "from": "sender@example.com",
  "subject": "Test",
  "html": "<p>Hello</p>"
}

// Response
{
  "id": "message-123",
  "status": "sent"
}
```
