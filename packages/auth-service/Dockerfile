FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application source code
COPY . .

# The service listens on port 3001 by default
EXPOSE 3001

# Start the service
CMD ["node", "src/server.js"]