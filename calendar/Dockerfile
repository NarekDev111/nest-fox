# stage1 as builder
FROM europe-west6-docker.pkg.dev/foxtrail-ch/apps/deps:latest as builder

WORKDIR /app

COPY . .
RUN npx nx build calendar

FROM nginx:alpine as production-build
COPY apps/calendar/.nginx/* /etc/nginx/

## Remove default nginx index page
RUN rm -rf /usr/share/nginx/html/*

# Copy from the stahg 1
COPY --from=builder /app/dist/apps/calendar /usr/share/nginx/html
RUN ls -la /usr/share/nginx/html

EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]
