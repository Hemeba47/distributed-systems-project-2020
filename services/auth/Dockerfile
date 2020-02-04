FROM node:10-alpine

RUN apk add curl
RUN npm install -g typescript ts-node ts-node-dev 

WORKDIR /etc/auth
COPY . .

RUN npm install

CMD ["tsnd", "--respawn", "src/index.ts"]
