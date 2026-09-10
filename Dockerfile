# Build stage using Bun
FROM oven/bun:1.1-alpine AS build

WORKDIR /app

# Copy package descriptors & install dependencies
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile || bun install

# Copy source code and build
COPY . .
RUN bun run build

# Production stage using Nginx
FROM nginx:alpine AS production

# Copy custom nginx configuration for SPA routing & reverse proxy
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://gallery-be:8080;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Streaming large files / ZIP
        proxy_buffering off;
        proxy_request_buffering off;

        # Large download / slow filesystem
        proxy_read_timeout 1h;
        proxy_send_timeout 1h;
        send_timeout 1h;
    }
}
EOF

# Copy static assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
