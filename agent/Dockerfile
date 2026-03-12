FROM rust:1.77-alpine AS builder
WORKDIR /src
RUN apk add --no-cache musl-dev openssl-dev pkgconfig
COPY Cargo.toml Cargo.lock* ./
# Cache deps layer — build empty main first
RUN mkdir src && echo "fn main(){}" > src/main.rs && \
    cargo build --release 2>/dev/null || true && \
    rm -rf src
COPY src ./src
# Touch main.rs to force rebuild
RUN touch src/main.rs && cargo build --release

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /src/target/release/infrawhisper-agent .
USER nobody
ENTRYPOINT ["./infrawhisper-agent"]
