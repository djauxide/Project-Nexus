FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o nexus-switcher .

FROM scratch
COPY --from=builder /app/nexus-switcher /nexus-switcher
EXPOSE 50051
ENTRYPOINT ["/nexus-switcher"]
