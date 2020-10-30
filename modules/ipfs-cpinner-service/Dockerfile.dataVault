FROM node:10

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

RUN npm i

COPY ./src ./src
COPY ./tsconfig.prod.json ./

EXPOSE 5107

CMD [ "npm", "run", "start:prod"]
