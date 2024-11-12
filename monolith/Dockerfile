FROM node:16-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/monolith/package*.json ./packages/monolith/

# Install dependencies
RUN npm install -g lerna
RUN lerna bootstrap --hoist

# Copy source code
COPY . .

# Build application
RUN lerna run build --scope @lemonstand/monolith

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "run", "start:prod"]
