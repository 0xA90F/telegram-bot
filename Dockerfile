FROM node:20-alpine

WORKDIR /app

# Copy semua file dulu
COPY . .

# Install dependencies
RUN npm install --production

# Expose port untuk health check Railway
EXPOSE 3000

# Start bot
CMD ["node", "src/index.js"]
