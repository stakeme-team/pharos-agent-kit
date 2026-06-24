FROM node:20-alpine

RUN apk add --no-cache bash

WORKDIR /app

# Source code is mounted via docker-compose volumes
# Dependencies installed via: docker compose run --rm install

CMD ["sh"]
