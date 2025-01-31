FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Default port for products service
EXPOSE 3002

CMD ["node", "src/server.js"]