FROM node:24-alpine3.21 AS build
WORKDIR /app

ENV PATH=/app/node_modules/.bin:$PATH

COPY package.json /app/package.json
COPY . /app
RUN corepack enable
RUN yarn install
RUN NODE_OPTIONS="--max_old_space_size=4096" yarn run build

FROM nginx:1.29.2-alpine
RUN apk add --no-cache bash jq

COPY /docker/nginx*.conf /etc/nginx/
COPY --from=build /app/build /usr/share/nginx/html
COPY --from=taktik/json-env:1.0.9-gf64566798c /usr/local/bin/json-env /usr/local/bin/json-env

EXPOSE 80

CMD sed -n 's/.*window\.config *= *\({.*}\).*/\1/p' /usr/share/nginx/html/index.html | sed -E 's/([{,])\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/\1"\2":/g' | jq '.' > /tmp/config.json \
    && /usr/local/bin/json-env /tmp/config.json \
    && CONF=$(jq -c . /tmp/config.json) \
    && sed -i -E "s|window\.config\s*=\s*(JSON\.stringify\(\s*)?\{[^}]*\}(\s*\))?;?|window.config=${CONF}|" /usr/share/nginx/html/index.html \
    && exec nginx -g 'daemon off;'
