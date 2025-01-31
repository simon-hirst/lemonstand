FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Orders service listens on port 3003
EXPOSE 3003

CMD ["node", "src/server.js"]