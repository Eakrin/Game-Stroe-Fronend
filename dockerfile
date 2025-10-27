# Stage 1: build the Angular app
FROM node:20 AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# ✅ Build Angular (ระบุ config ให้ถูก)
RUN npm run build -- --configuration=production

# Stage 2: serve with nginx
FROM nginx:alpine
# ✅ ตรวจสอบชื่อโฟลเดอร์ dist ให้ตรงกับ angular.json
COPY --from=build /app/dist/Gamestore /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
