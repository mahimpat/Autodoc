FROM node:22-alpine
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies
COPY frontend/package.json ./
RUN npm install

# Copy source code
COPY frontend ./

# Build the application
RUN npm run build

EXPOSE 3000

# Use production start command
CMD ["npm", "start"]
