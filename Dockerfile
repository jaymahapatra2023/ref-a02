# Node 22 has an HTTP server, a test runner and fetch in the standard library, so this image
# needs nothing from a package registry — the build is the copy.
FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY test ./test
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "src/server.js"]
