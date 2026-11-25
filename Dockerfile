
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY public ./public

RUN mkdir -p /app/public/uploads /app/public/img /app/src/public/uploads

EXPOSE 3000

CMD ["npm", "start"]
