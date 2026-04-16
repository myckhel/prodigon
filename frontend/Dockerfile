# ---------------------------------------------------------------------------
# Multi-stage Docker build for the Prodigon frontend
# Stage 1: Build the Vite/React app
# Stage 2: Serve the static bundle via nginx
# ---------------------------------------------------------------------------

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
