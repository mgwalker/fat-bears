FROM alpine

RUN apk add --update git nodejs npm

RUN mkdir /app
WORKDIR /app

RUN npm i @actions/exec @octokit/rest jsonpath

COPY blank_bracket.json /app/blank_bracket.json
COPY converse.js /app/converse.js

ENTRYPOINT ["node", "/app/converse.js"]