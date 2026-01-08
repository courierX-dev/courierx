# CourierX Development Milestones & Roadmap

## 📊 Sprint Planning Overview

**Total Estimated Story Points**: 380 points
**Estimated Duration**: 12-16 weeks (3-4 months)
**Team Velocity Assumption**: 30-40 points per 2-week sprint

> **Tech Stack Decision**: Rails API-only (no views) + Next.js Dashboard + Go Core
> This approach maximizes hiring flexibility and uses industry-standard technologies.

---

## 🎯 Milestone 1: Foundation & Core Infrastructure
**Sprint**: 1-2 (Weeks 1-4)
**Total Story Points**: 89
**Status**: 🟢 In Progress

### Epic 1.1: Rails Control Plane - Core Models (34 pts)

| Story | Description | Story Points | Priority | Dependencies |
|-------|-------------|--------------|----------|--------------|
| CP-001 | Create Tenant model with validations | 3 | P0 | Database |
| CP-002 | Create User model with authentication | 5 | P0 | Tenant |
| CP-003 | Create Product model with tenant association | 3 | P0 | Tenant |
| CP-004 | Create ApiKey model with hashing | 5 | P0 | Product |
| CP-005 | Create ProviderAccount model with encryption | 8 | P0 | Tenant |
| CP-006 | Create Route model for provider failover | 3 | P1 | Product, ProviderAccount |
| CP-007 | Create Message model for email tracking | 3 | P1 | Product |
| CP-008 | Create Event model for delivery tracking | 2 | P1 | Message |
| CP-009 | Create Template model for email templates | 2 | P2 | Product |

**Acceptance Criteria**:
- [ ] All models have proper validations
- [ ] Database migrations run successfully
- [ ] Model associations work correctly
- [ ] Sensitive data is encrypted (provider credentials, API keys)
- [ ] Unit tests cover all models (>90% coverage)

---

### Epic 1.2: Authentication & Authorization (21 pts)

| Story | Description | Story Points | Priority | Dependencies |
|-------|-------------|--------------|----------|--------------|
| CP-010 | Implement JWT authentication service | 5 | P0 | User model |
| CP-011 | Create user registration endpoint | 3 | P0 | JWT service |
| CP-012 | Create user login endpoint | 3 | P0 | JWT service |
| CP-013 | Implement API key authentication middleware | 5 | P0 | ApiKey model |
| CP-014 | Add role-based access control (RBAC) | 5 | P1 | User, Tenant models |

**Acceptance Criteria**:
- [ ] JWT tokens generated and validated correctly
- [ ] API key authentication works for programmatic access
- [ ] Password hashing using bcrypt
- [ ] RBAC enforces permissions (owner, admin, developer, viewer)
- [ ] Authentication tests pass

---

### Epic 1.3: Go Core - Provider System Enhancement (34 pts)

| Story | Description | Story Points | Priority | Dependencies |
|-------|-------------|--------------|----------|--------------|
| GO-001 | Implement real AWS SES provider | 8 | P0 | AWS SDK |
| GO-002 | Implement real SMTP provider with pooling | 5 | P0 | net/smtp |
| GO-003 | Add Postmark provider | 3 | P1 | HTTP client |
| GO-004 | Add Resend provider | 3 | P1 | HTTP client |
| GO-005 | Implement provider credential fetching from Rails | 8 | P0 | Rails API |
| GO-006 | Add provider health checking | 3 | P1 | All providers |
| GO-007 | Implement retry logic with exponential backoff | 4 | P0 | Router |

**Acceptance Criteria**:
- [ ] All providers send emails successfully
- [ ] Provider credentials fetched securely from Rails
- [ ] Retry logic handles transient failures
- [ ] Health checks detect provider issues
- [ ] Integration tests for each provider

---

## 🎯 Milestone 2: Core Features & API Development
**Sprint**: 3-5 (Weeks 5-10)
**Total Story Points**: 134
**Status**: 🟡 Not Started

### Epic 2.1: Rails API Endpoints (55 pts)

| Story | Description | Story Points | Priority | Dependencies |
|-------|-------------|--------------|----------|--------------|
| CP-020 | Create Product CRUD endpoints | 5 | P0 | Product model |
| CP-021 | Create API Key management endpoints | 5 | P0 | ApiKey model |
| CP-022 | Create Provider configuration endpoints | 8 | P0 | ProviderAccount model |
| CP-023 | Create Routing rules endpoints | 8 | P0 | Route model |
| CP-024 | Create Template management endpoints | 5 | P1 | Template model |
| CP-025 | Create Message history/search endpoints | 5 | P1 | Message model |
| CP-026 | Create Event tracking endpoints | 3 | P1 | Event model |
| CP-027 | Create User management endpoints | 5 | P1 | User model |
| CP-028 | Create Team/Tenant management endpoints | 5 | P1 | Tenant model |
| CP-029 | Add API documentation (OpenAPI/Swagger) | 6 | P2 | All endpoints |

**Acceptance Criteria**:
- [ ] RESTful API design followed
- [ ] Proper error handling and status codes
- [ ] Request validation and sanitization
- [ ] API documentation auto-generated
- [ ] Integration tests for all endpoints

---

### Epic 2.2: Email Sending Pipeline (34 pts)

| Story | Description | Story Points | Priority | Dependencies |
|-------|-------------|--------------|----------|--------------|
| CP-030 | Create email send request validation service | 5 | P0 | Rails API |
| CP-031 | Implement rate limiting per product | 8 | P0 | Product model |
| CP-032 | Add suppression list checking | 5 | P0 | Suppression model |
| CP-033 | Integrate Rails → Go Core HTTP communication | 8 | P0 | Go Core API |
| CP-034 | Implement batch send endpoint | 5 | P1 | Send service |
| CP-035 | Add idempotency key support | 3 | P1 | Redis |

**Acceptance Criteria**:
- [ ] Emails sent successfully through Go Core
- [ ] Rate limits enforced correctly
- [ ] Suppression list prevents sends to bounced/complained emails
- [ ] Rails and Go communicate securely
- [ ] Idempotency prevents duplicate sends

---

### Epic 2.3: Webhook Processing (23 pts)

| Story | Description | Story Points | Priority | Dependencies |
|-------|-------------|--------------|----------|--------------|
| GO-010 | Implement SendGrid webhook verification | 5 | P0 | SendGrid provider |
| GO-011 | Implement Mailgun webhook verification | 5 | P0 | Mailgun provider |
| GO-012 | Implement SES SNS webhook processing | 5 | P0 | SES provider |
| GO-013 | Create webhook event normalization | 3 | P0 | All webhooks |
| GO-014 | Store webhook events in database | 3 | P0 | Event model |
| GO-015 | Create webhook retry handling | 2 | P1 | Queue |

**Acceptance Criteria**:
- [ ] Webhook signatures verified correctly
- [ ] Events normalized to common format
- [ ] Events stored in database
- [ ] Failed webhook retries handled
- [ ] Webhook processing tests pass

---

### Epic 2.4: Background Jobs & Queue System (22 pts)

| Story | Description | Story Points | Priority | Dependencies |
|-------|-------------|--------------|----------|--------------|
| CP-040 | Set up Sidekiq for background jobs | 3 | P0 | Redis |
| CP-041 | Create usage aggregation job | 5 | P0 | Message model |
| CP-042 | Create daily/monthly billing calculation job | 5 | P1 | Usage data |
| CP-043 | Create bounce/complaint cleanup job | 3 | P1 | Suppression model |
| GO-020 | Implement Redis-based job queue in Go | 3 | P2 | Redis |
| GO-021 | Add worker pool management | 3 | P2 | Queue |

**Acceptance Criteria**:
- [ ] Sidekiq processes jobs reliably
- [ ] Usage aggregated accurately
- [ ] Billing calculations correct
- [ ] Job retries configured
- [ ] Queue monitoring available

---

## 🎯 Milestone 3: Business Features & Integration
**Sprint**: 6-8 (Weeks 11-16)
**Total Story Points**: 89
**Status**: 🟡 Not Started

### Epic 3.1: Billing & Subscription (34 pts)

| Story | Description | Story Points | Priority | Dependencies |
|-------|-------------|--------------|----------|--------------|
| CP-050 | Integrate Stripe for payment processing | 8 | P0 | Stripe gem |
| CP-051 | Create Subscription model | 5 | P0 | Tenant |
| CP-052 | Implement plan management (free, pro, enterprise) | 5 | P0 | Subscription |
| CP-053 | Create billing endpoints | 5 | P0 | Stripe integration |
| CP-054 | Implement usage-based billing | 8 | P0 | Usage aggregation |
| CP-055 | Add invoice generation | 3 | P1 | Stripe |

**Acceptance Criteria**:
- [ ] Stripe integration works end-to-end
- [ ] Plans created and assigned correctly
- [ ] Usage-based billing calculates accurately
- [ ] Invoices generated and sent
- [ ] Payment webhooks processed

---

### Epic 3.2: Advanced Features (34 pts)

| Story | Description | Story Points | Priority | Dependencies |
|-------|-------------|--------------|----------|--------------|
| CP-060 | Implement email analytics dashboard | 8 | P1 | Event model |
| CP-061 | Create domain verification system | 5 | P1 | SendingDomain model |
| CP-062 | Add IP warming support | 5 | P1 | Route model |
| CP-063 | Implement A/B testing for templates | 5 | P2 | Template model |
| CP-064 | Add real-time event streaming (WebSockets) | 8 | P2 | ActionCable |
| CP-065 | Create audit logging system | 3 | P1 | AuditLog model |

**Acceptance Criteria**:
- [ ] Analytics show delivery, open, click rates
- [ ] Domain verification (SPF, DKIM, DMARC) works
- [ ] IP warming gradually increases send volume
- [ ] A/B tests track results
- [ ] Real-time events pushed to frontend

---

### Epic 3.3: Monitoring & Observability (21 pts)

| Story | Description | Story Points | Priority | Dependencies |
|-------|-------------|--------------|----------|--------------|
| GO-030 | Add Prometheus metrics export | 5 | P0 | Prometheus |
| GO-031 | Implement structured logging (zerolog) | 3 | P0 | None |
| GO-032 | Add distributed tracing (OpenTelemetry) | 5 | P1 | OTEL SDK |
| CP-070 | Add Sentry error tracking | 3 | P0 | Sentry gem |
| CP-071 | Create health check endpoints | 2 | P0 | None |
| CP-072 | Implement alerting rules | 3 | P1 | Prometheus |

**Acceptance Criteria**:
- [ ] Metrics exported to Prometheus
- [ ] Logs structured and searchable
- [ ] Traces show request flow
- [ ] Errors reported to Sentry
- [ ] Alerts fire for critical issues

---

## 🎯 Milestone 4: Frontend & Polish
**Sprint**: 9-10 (Weeks 17-20)
**Total Story Points**: 68
**Status**: 🟡 Not Started

### Epic 4.1: Next.js Dashboard (58 pts)

| Story | Description | Story Points | Priority | Dependencies |
|-------|-------------|--------------|----------|--------------|
| FE-001 | Set up Next.js 14 with App Router and TypeScript | 5 | P0 | None |
| FE-002 | Install shadcn/ui and configure Tailwind CSS | 3 | P0 | Next.js |
| FE-003 | Create authentication flow (login, signup, JWT) | 8 | P0 | Rails API |
| FE-004 | Create dashboard homepage with real-time metrics | 10 | P0 | Analytics API |
| FE-005 | Create provider management UI with drag-drop routing | 8 | P0 | Provider API |
| FE-006 | Create API key management UI | 5 | P0 | ApiKey API |
| FE-007 | Create message history with advanced filtering | 8 | P0 | Message API |
| FE-008 | Create template editor with live preview | 6 | P1 | Template API |
| FE-009 | Create billing/subscription UI | 5 | P1 | Billing API |

**Acceptance Criteria**:
- [ ] Next.js app deployed and accessible
- [ ] JWT authentication working with Rails API
- [ ] All CRUD operations work via API calls
- [ ] Real-time updates using WebSocket or Server-Sent Events
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] E2E tests with Playwright for critical paths
- [ ] TypeScript strict mode with no errors

---

### Epic 4.2: Documentation & Polish (10 pts)

| Story | Description | Story Points | Priority | Dependencies |
|-------|-------------|--------------|----------|--------------|
| DOC-001 | Write API integration guide | 3 | P0 | API docs |
| DOC-002 | Create provider setup guides | 2 | P0 | Providers |
| DOC-003 | Write deployment documentation | 2 | P0 | Infra |
| DOC-004 | Create video tutorials | 3 | P2 | All features |

**Acceptance Criteria**:
- [ ] Documentation is clear and complete
- [ ] Code examples work
- [ ] Deployment guide tested
- [ ] Videos published

---

## 📅 Sprint Breakdown

### Sprint 1-2: Foundation (Weeks 1-4)
**Goal**: Core models, authentication, basic Go providers
- Epic 1.1: Rails Core Models (34 pts)
- Epic 1.2: Authentication (21 pts)
- Epic 1.3: Go Provider System (34 pts)
- **Total**: 89 pts

### Sprint 3-4: Core API (Weeks 5-8)
**Goal**: API endpoints, email sending, webhooks
- Epic 2.1: Rails API Endpoints (55 pts)
- Epic 2.2: Email Sending Pipeline (34 pts)
- **Total**: 89 pts

### Sprint 5-6: Advanced Backend (Weeks 9-12)
**Goal**: Background jobs, webhooks, billing
- Epic 2.3: Webhook Processing (23 pts)
- Epic 2.4: Background Jobs (22 pts)
- Epic 3.1: Billing & Subscription (34 pts)
- **Total**: 79 pts

### Sprint 7-8: Business Features (Weeks 13-16)
**Goal**: Analytics, advanced features, monitoring
- Epic 3.2: Advanced Features (34 pts)
- Epic 3.3: Monitoring (21 pts)
- **Total**: 55 pts

### Sprint 9-10: Frontend (Weeks 17-20)
**Goal**: Dashboard, documentation, polish
- Epic 4.1: Next.js Dashboard (58 pts)
- Epic 4.2: Documentation (10 pts)
- **Total**: 68 pts

---

## 🎯 Definition of Done

For a story to be considered "Done", it must meet ALL criteria:

### Code Quality
- [ ] Code reviewed and approved by at least one team member
- [ ] Follows language style guides (Go: gofmt, Rails: Rubocop)
- [ ] No linting errors
- [ ] Code coverage ≥ 80% for critical paths

### Testing
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Manual testing completed
- [ ] No known bugs

### Documentation
- [ ] API endpoints documented (if applicable)
- [ ] Code comments for complex logic
- [ ] README updated (if needed)
- [ ] CHANGELOG updated

### Deployment
- [ ] Works in development environment
- [ ] Works in staging environment
- [ ] Database migrations run successfully
- [ ] No breaking changes (or documented)

---

## 📊 Velocity Tracking

| Sprint | Planned Points | Completed Points | Velocity | Notes |
|--------|---------------|------------------|----------|-------|
| 1 | 45 | - | - | Foundation |
| 2 | 44 | - | - | Foundation |
| 3 | 45 | - | - | Core API |
| 4 | 44 | - | - | Core API |
| 5 | 40 | - | - | Advanced Backend |
| 6 | 39 | - | - | Advanced Backend |
| 7 | 28 | - | - | Business Features |
| 8 | 27 | - | - | Business Features |
| 9 | 33 | - | - | Frontend |
| 10 | 32 | - | - | Frontend & Polish |

**Target Velocity**: 30-40 points per 2-week sprint
**Total**: 380 points ÷ 10 sprints = ~38 points/sprint

---

## 🚀 Getting Started

1. Review this milestone document
2. Read `docs/IMPLEMENTATION_GUIDE.md` for step-by-step instructions
3. Check `docs/STORY_DETAILS.md` for detailed acceptance criteria
4. Start with Epic 1.1 (Rails Core Models)
5. Track progress in project management tool (Jira, Linear, etc.)

---

## 📞 Support & Questions

- **Technical Questions**: See `docs/IMPLEMENTATION_GUIDE.md`
- **Architecture**: See `docs/ARCHITECTURE.md`
- **API Reference**: See `docs/API_REFERENCE.md`
- **Setup Issues**: See `SETUP_COMPLETE.md`
