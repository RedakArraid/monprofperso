FROM nginx:alpine
ENV API_UPSTREAM=api:8099 NGINX_ENVSUBST_FILTER="^API_UPSTREAM$"
COPY . /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/templates/default.conf.template
RUN rm -f /usr/share/nginx/html/nginx.conf
