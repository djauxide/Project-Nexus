FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN go build -o atem-service .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/atem-service .
EXPOSE 9910/udp
EXPOSE 8081
ENV ATEM_HOST=192.168.1.240
ENV ATEM_PORT=9910
ENV HTTP_PORT=8081
CMD ["./atem-service"]
