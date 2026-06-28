FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
# The hub reads ../labs at runtime; mount it via docker-compose.
EXPOSE 3000
CMD ["node", "server.js"]
