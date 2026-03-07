FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy client and server package files
COPY client/package.json client/
COPY server/package.json server/

# Install all dependencies
RUN npm install && cd client && npm install && cd ../server && npm install

# Copy source code
COPY client/ client/
COPY server/ server/

# Build client
RUN cd client && npm run build

# Build server
RUN cd server && npm run build

# Create data directory for persistent storage
RUN mkdir -p server/data paused_games

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "server/dist/index.js"]
