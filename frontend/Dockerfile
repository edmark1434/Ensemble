# Stage 1: Build the React app
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files first to leverage Docker caching
COPY package*.json ./
# Use 'npm ci' for more reliable production builds
RUN npm install 

COPY . .
# This is where it's failing. Adding the CI flag helps see exact errors.
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# COPY nginx.conf /etc/nginx/conf.d/default.conf 
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
