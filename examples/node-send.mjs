#!/usr/bin/env node

/**
 * CourierX Email Examples
 *
 * Demonstrates sending emails using:
 * 1. The @courierx/node SDK (recommended)
 * 2. The REST API directly via fetch
 *
 * Set COURIERX_API_KEY in your environment before running:
 *   export COURIERX_API_KEY=cxk_live_your_api_key
 *   node examples/node-send.mjs
 */

const API_KEY = process.env.COURIERX_API_KEY
const BASE_URL = process.env.COURIERX_API_URL || "https://api.courierx.dev"

if (!API_KEY) {
  console.error("Set COURIERX_API_KEY before running this example.")
  console.error("  export COURIERX_API_KEY=cxk_live_your_api_key")
  process.exit(1)
}

// ── Example 1: Using the SDK ────────────────────────────────────────────────

async function sendWithSDK() {
  // npm install @courierx/node
  const { CourierX } = await import("@courierx/node")

  const courierx = new CourierX({ apiKey: API_KEY, baseUrl: BASE_URL })

  const result = await courierx.emails.send({
    from: "hello@yourapp.com",
    to: "user@example.com",
    subject: "Hello from CourierX SDK",
    html: "<h1>Hello World</h1><p>Sent via the @courierx/node SDK.</p>",
    text: "Hello World\n\nSent via the @courierx/node SDK.",
    tags: ["example"],
  })

  console.log("SDK send result:", result.email.id, result.email.status)
}

// ── Example 2: Suppressions ─────────────────────────────────────────────────

async function suppressionsExample() {
  const { CourierX } = await import("@courierx/node")
  const courierx = new CourierX({ apiKey: API_KEY, baseUrl: BASE_URL })

  // Manually suppress an address
  const suppression = await courierx.suppressions.create({
    email: "unsubscribed@example.com",
    reason: "unsubscribe",
  })
  console.log("Suppressed:", suppression.email, suppression.reason)

  // List suppressions
  const list = await courierx.suppressions.list({ reason: "bounce" })
  console.log("Bounce suppressions:", list.length)
}

// ── Example 3: Webhooks ──────────────────────────────────────────────────────

async function webhooksExample() {
  const { CourierX } = await import("@courierx/node")
  const courierx = new CourierX({ apiKey: API_KEY, baseUrl: BASE_URL })

  const endpoint = await courierx.webhooks.create({
    url: "https://yourapp.com/webhooks/email",
    events: ["email.delivered", "email.bounced", "email.complained"],
  })
  console.log("Webhook registered:", endpoint.id, endpoint.url)
}

// ── Example 4: Templates ─────────────────────────────────────────────────────

async function templatesExample() {
  const { CourierX } = await import("@courierx/node")
  const courierx = new CourierX({ apiKey: API_KEY, baseUrl: BASE_URL })

  const template = await courierx.templates.create({
    name: "Welcome email",
    subject: "Welcome to {{company_name}}",
    html_body: "<h1>Hi {{first_name}}, welcome!</h1>",
    text_body: "Hi {{first_name}}, welcome!",
  })
  console.log("Template created:", template.id, template.name)
}

// ── Example 5: Using fetch directly ─────────────────────────────────────────

async function sendWithFetch() {
  const response = await fetch(`${BASE_URL}/api/v1/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from_email: "hello@yourapp.com",
      to_email: "user@example.com",
      subject: "Hello from CourierX REST API",
      html_body: "<h1>Hello World</h1><p>Sent via the REST API.</p>",
      text_body: "Hello World\n\nSent via the REST API.",
      tags: ["example"],
    }),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`)
  }

  const result = await response.json()
  console.log("REST send result:", result.email.id, result.email.status)
}

// ── Run ─────────────────────────────────────────────────────────────────────

console.log("CourierX Email Examples\n")

console.log("1. Sending via REST API (fetch)...")
try {
  await sendWithFetch()
} catch (error) {
  console.error("   Failed:", error.message)
}

console.log("\n2. Sending via @courierx/node SDK...")
try {
  await sendWithSDK()
} catch (error) {
  console.error("   Failed:", error.message)
  if (error.code === "ERR_MODULE_NOT_FOUND") {
    console.error("   Install the SDK first: npm install @courierx/node")
  }
}

console.log("\n3. Suppressions...")
try {
  await suppressionsExample()
} catch (error) {
  console.error("   Failed:", error.message)
}

console.log("\n4. Webhooks...")
try {
  await webhooksExample()
} catch (error) {
  console.error("   Failed:", error.message)
}

console.log("\n5. Templates...")
try {
  await templatesExample()
} catch (error) {
  console.error("   Failed:", error.message)
}
