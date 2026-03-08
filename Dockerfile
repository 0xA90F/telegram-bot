FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --production

# Copy source
COPY src/ ./src/

# Expose port untuk health check Railway
EXPOSE 3000

# Start bot
CMD ["node", "src/index.js"]
