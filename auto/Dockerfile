# Imagen oficial de Node
FROM node:18-slim

# Instalar dependencias para chromium/playwright
RUN apt-get update && \
    apt-get install -y wget gnupg ca-certificates && \
    apt-get install -y libnss3 libxss1 libasound2 libatk1.0-0 libatk-bridge2.0-0 \
    libx11-xcb1 libpangocairo-1.0-0 libdrm2 libgbm1 libxdamage1 libxfixes3 \
    libpango-1.0-0 libcairo2 libxcomposite1 libxrandr2 libxi6 libgtk-3-0

# Instalar Playwright con Chromium
RUN npx playwright install chromium

# Crear carpeta app
WORKDIR /app

# Copiar archivos
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
