FROM alpine

RUN apk add --update git nodejs npm

RUN mkdir /app
WORKDIR /app

COPY package.json /app/package.json
RUN npm install

COPY blank_bracket.json /app/blank_bracket.json
COPY converse.js /app/converse.js

ENTRYPOINT ["node", "/app/converse.js"]