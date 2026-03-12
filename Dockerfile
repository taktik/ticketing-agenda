FROM node:24-alpine3.21 AS build
WORKDIR /app

ENV PATH=/app/node_modules/.bin:$PATH

COPY package.json /app/package.json
COPY . /app
RUN corepack enable
RUN yarn install
RUN NODE_OPTIONS="--max_old_space_size=4096" yarn run build

FROM nginx:1.29.2-alpine
RUN apk add --no-cache bash jq perl

COPY /docker/nginx*.conf /etc/nginx/
COPY --from=build /app/build /usr/share/nginx/html
COPY --from=taktik/json-env:1.0.9-gf64566798c /usr/local/bin/json-env /usr/local/bin/json-env

EXPOSE 80

CMD perl -0777 -ne 'print $1 if /window\.config\s*=\s*(\{.*?\})/s' /usr/share/nginx/html/index.html | jq '.' > /tmp/config.json \
    && /usr/local/bin/json-env /tmp/config.json \
    && CONF=$(jq -c . /tmp/config.json) \
    && perl -i -0777 -pe "s|window\.config\s*=\s*\{.*?\}|window.config=${CONF}|s" /usr/share/nginx/html/index.html \
    && exec nginx -g 'daemon off;'
