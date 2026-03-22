# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git make

# Copy go mod files from new path
COPY backend/core-go/go.mod backend/core-go/go.sum ./
RUN go mod download

# Copy source code from new path
COPY backend/core-go/ ./

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o courierx-core .

# Runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

COPY --from=builder /app/courierx-core .

ENV PORT=8080
EXPOSE $PORT

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

CMD ["sh", "-c", "./courierx-core"]
