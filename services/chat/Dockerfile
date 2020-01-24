FROM node:10-alpine

RUN npm install -g typescript ts-node ts-node-dev 

WORKDIR /etc/chat
COPY . .

RUN npm install

CMD ["tsnd", "--respawn", "src/index.ts"]
