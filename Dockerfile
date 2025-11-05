# Use Node.js 20 as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy all application files including node_modules
COPY . .

# Expose port 3333 for the webserver
EXPOSE 3333

# Start the application
CMD ["npm", "start"]
