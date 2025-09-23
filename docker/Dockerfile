FROM nginx:alpine

# Remove configuração default
RUN rm /etc/nginx/conf.d/default.conf

# Copia a sua config customizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos do app
COPY ./public/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
