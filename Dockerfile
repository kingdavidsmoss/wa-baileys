FROM node:23-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --strict-ssl=false

COPY src/ ./src/

# La sesión QR se persiste en un volumen externo
VOLUME ["/app/auth_info"]

CMD ["node", "src/index.js"]
