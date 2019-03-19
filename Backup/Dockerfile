FROM alpine
RUN apk add --no-cache postgresql-client
RUN apk add aws-cli --no-cache --repository http://dl-3.alpinelinux.org/alpine/edge/testing/ --allow-untrusted
COPY secrets/credentials /root/.aws/credentials
COPY backup /bin/backup
COPY crontab /etc/crontabs/root
CMD ["/usr/sbin/crond", "-f", "-d", "8"]
