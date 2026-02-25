# Build: docker build -t git-workflow-test .
# Run unit tests: docker run --rm git-workflow-test
# Run E2E tests: docker run --rm git-workflow-test e2e

FROM node:20-alpine

WORKDIR /app

# Install git (needed for tests)
RUN apk add --no-cache git bash

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source and test files
COPY . .

# Build TypeScript
RUN npm run build

# Install globally for CLI use
RUN npm install -g .

# Run tests with coverage
CMD ["npm", "test", "--", "--coverage"]