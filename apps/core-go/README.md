# CourierX Core (Go)

High-performance email execution plane built with Go and Fiber.

## Features

- ⚡ High throughput email sending
- 🔄 Provider failover and retry logic
- 📊 Multiple provider support (SendGrid, Mailgun, SES, SMTP, Mock)
- 🎨 Handlebars template rendering
- 🚀 Built with Fiber for maximum performance

## Quick Start

### 1. Install Dependencies

```bash
go mod download
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Run the Server

```bash
go run main.go
```

Server will start on `http://localhost:8080`

## API Endpoints

### Health Check
```bash
GET /health
```

### Send Email
```bash
POST /v1/send
Content-Type: application/json

{
  "from": "sender@example.com",
  "to": "recipient@example.com",
  "subject": "Hello",
  "html": "<p>Hello {{name}}!</p>",
  "variables": {
    "name": "World"
  }
}
```

### Bulk Send
```bash
POST /v1/send/batch
Content-Type: application/json

{
  "from": "sender@example.com",
  "subject": "Newsletter",
  "html": "<p>Hello {{name}}!</p>",
  "recipients": [
    {
      "email": "user1@example.com",
      "variables": { "name": "User 1" }
    },
    {
      "email": "user2@example.com",
      "variables": { "name": "User 2" }
    }
  ]
}
```

## Benchmarking

This implementation is designed for benchmarking against the Node.js version.

To run benchmarks:
```bash
# Start the Go server
go run main.go

# In another terminal, run the benchmark suite
cd ../../benchmark
export GO_API_PID=$(pgrep -f "core-go")
npm run test:go
```

## Architecture

- **Fiber**: Web framework optimized for speed
- **pgx**: PostgreSQL driver with connection pooling
- **raymond**: Handlebars template engine
- **Provider abstraction**: Easy to add new email providers
- **Router with failover**: Automatic provider failover on errors

## Performance Optimizations

- Zero-allocation router
- Connection pooling (100 max, 10 min)
- Optimized HTTP timeouts
- Compiled binary for production
- Minimal dependencies
