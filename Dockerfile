FROM node:24-alpine3.21 as build
WORKDIR /app

COPY package.json /app/package.json
RUN yarn install
COPY . /app
RUN NODE_OPTIONS="--max_old_space_size=4096" yarn run build

FROM nginx:1.29.2-alpine
COPY /docker/nginx*.conf /etc/nginx/
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
