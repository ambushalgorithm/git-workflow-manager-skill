# Build: docker build -t git-workflow-test .
# Run:   docker run --rm git-workflow-test

FROM node:20-alpine

WORKDIR /app

# Install git (needed for tests)
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source and test files
COPY . .

# Build TypeScript
RUN npm run build

# Run tests with coverage
CMD ["npm", "test", "--", "--coverage"]