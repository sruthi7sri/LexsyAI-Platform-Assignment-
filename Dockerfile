# Dockerfile

FROM node:18-alpine

WORKDIR /app

# Backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY . .

EXPOSE 3000 3001

CMD ["npm", "run", "start:all"]