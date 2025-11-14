FROM node:20.10-alpine as base


WORKDIR /app


COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build


FROM node:20.10-alpine as target

WORKDIR /app

COPY --from=base /app/package*.json /app/
COPY --from=base /app/.next /app/

RUN npm install --production

EXPOSE 3000


CMD ["npm", "start"]