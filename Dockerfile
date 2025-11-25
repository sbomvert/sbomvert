FROM node:20.19.5-alpine3.22 AS base


WORKDIR /app


COPY package*.json ./
COPY . .
RUN npm install

RUN npm run build


FROM node:20.19.5-alpine3.22 AS target

WORKDIR /app

COPY --from=base /app/package*.json ./
RUN npm install --production

COPY --from=base /app/public ./public
COPY --from=base /app/.next ./.next
EXPOSE 3000


CMD ["npm", "start"]
