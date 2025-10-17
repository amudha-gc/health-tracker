FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:18-alpine
# Add tzdata so TZ works
RUN apk add --no-cache tzdata
ENV TZ=Australia/Brisbane

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY server.js ./
COPY --from=frontend-build /app/frontend/build ./public
RUN mkdir -p /app/data
EXPOSE 3001
ENV NODE_ENV=production PORT=3001
CMD ["node", "server.js"]
