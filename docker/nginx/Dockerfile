# TLS-terminating reverse proxy so the GUI (and its embedded Studio / Claude
# CLI iframes) can be reached over https — browsers require a secure context
# for microphone access (voice cloning), which plain http on a non-localhost
# host silently denies.
FROM nginx:alpine

RUN apk add --no-cache openssl \
    && mkdir -p /etc/nginx/certs \
    && openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
         -keyout /etc/nginx/certs/selfsigned.key \
         -out /etc/nginx/certs/selfsigned.crt \
         -subj "/CN=aivideocreator" \
         -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 8443 3443 7443
