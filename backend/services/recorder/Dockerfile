FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o nexus-recorder .

FROM scratch
COPY --from=builder /app/nexus-recorder /nexus-recorder
EXPOSE 8095
ENTRYPOINT ["/nexus-recorder"]
