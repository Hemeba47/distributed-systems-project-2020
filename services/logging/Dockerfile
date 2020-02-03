FROM node:10-alpine

RUN npm install -g nodemon

WORKDIR /etc/logging
COPY . .

RUN npm install

CMD ["nodemon",  "src/index.js"]
