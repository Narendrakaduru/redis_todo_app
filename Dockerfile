# Use Node.js LTS base image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy rest of the app
COPY . .

# Expose app port
EXPOSE 3000

# Start the app
CMD ["node", "index.js"]