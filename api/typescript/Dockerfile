# TypeScript Avalanche Chainlink API
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S chainlink -u 1001

# Change ownership
RUN chown -R chainlink:nodejs /app
USER chainlink

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
               http.get('http://localhost:3000/health', (res) => { \
                 process.exit(res.statusCode === 200 ? 0 : 1); \
               }).on('error', () => process.exit(1));"

# Start the application
CMD ["npm", "start"]