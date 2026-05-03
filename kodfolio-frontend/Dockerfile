FROM node:20-alpine

WORKDIR /app

# Установка @angular/cli глобально
RUN npm install -g @angular/cli@17

# Зависимости — сначала, для кеша слоёв
COPY package.json package-lock.json* ./
RUN npm install

# Копирование исходников (в dev будет смонтировано volume сверху)
COPY . .

EXPOSE 4200

# ng serve с hot reload, доступен извне контейнера
CMD ["npm", "start"]
