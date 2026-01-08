# Load Testing with k6

This directory contains load and performance tests for CourierX using [k6](https://k6.io/).

## Installation

### macOS
```bash
brew install k6
```

### Linux
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Windows
```powershell
choco install k6
```

## Running Tests

### Email Sending Load Test
```bash
# Basic run
k6 run send-email.js

# With environment variables
k6 run --env API_KEY=sk_test_xxx --env BASE_URL=http://localhost:4000 send-email.js

# With custom VUs and duration
k6 run --vus 50 --duration 2m send-email.js
```

### API Endpoints Test
```bash
k6 run --env JWT_TOKEN=your_token api-endpoints.js
```

### Stress Test
```bash
k6 run stress-test.js
```

## Test Scenarios

### send-email.js
- **Purpose**: Test email sending endpoint under load
- **Duration**: ~6 minutes
- **Peak Load**: 100 concurrent users
- **Metrics**:
  - Request duration (p95 < 500ms)
  - Error rate (< 10%)
  - Email send duration (p95 < 1s)

### api-endpoints.js
- **Purpose**: Test all API endpoints
- **Duration**: ~5 minutes
- **Peak Load**: 50 concurrent users
- **Tests**:
  - Health checks
  - Product management
  - API key management
  - Message history

### stress-test.js
- **Purpose**: Find system breaking point
- **Duration**: ~31 minutes
- **Peak Load**: 300 concurrent users
- **Goal**: Identify max capacity

## Metrics Explained

- **http_req_duration**: Total request time
- **http_req_waiting**: Time to first byte
- **http_req_sending**: Time sending data
- **http_req_receiving**: Time receiving response
- **http_reqs**: Total number of requests
- **vus**: Number of virtual users
- **errors**: Custom error rate metric

## Thresholds

Tests will fail if:
- 95th percentile response time > 500ms (send-email.js)
- Error rate > 10%
- 99th percentile > 3s (stress-test.js)

## Cloud Testing

Run tests from k6 Cloud:
```bash
k6 cloud send-email.js
```

## Results

Results are printed to stdout. For better visualization:

### HTML Report
```bash
k6 run --out json=results.json send-email.js
# Then use k6-reporter or similar tool
```

### InfluxDB + Grafana
```bash
k6 run --out influxdb=http://localhost:8086/k6 send-email.js
```

## Tips

1. **Start small**: Begin with low VUs and gradually increase
2. **Monitor resources**: Watch CPU, memory, database connections
3. **Baseline first**: Run tests against baseline before changes
4. **Isolate tests**: Run one test at a time
5. **Clean data**: Reset test data between runs

## Environment Variables

- `API_KEY`: CourierX API key for authentication
- `JWT_TOKEN`: JWT token for admin endpoints
- `BASE_URL`: Base URL of the API (default: http://localhost:4000)

## Troubleshooting

### High error rates
- Check database connection pool size
- Verify rate limits aren't being hit
- Check Go Core worker pool configuration

### Slow response times
- Review database query performance
- Check Redis connection
- Monitor Go Core provider latency

### Connection errors
- Ensure services are running
- Check firewall rules
- Verify URL and ports
