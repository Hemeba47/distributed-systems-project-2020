FROM node:10-alpine

RUN npm install -g nodemon

WORKDIR /etc/logging
COPY . .

RUN npm install

HEALTHCHECK CMD curl --fail http://localhost:5000/ || exit 1

CMD ["nodemon",  "src/index.js"]
