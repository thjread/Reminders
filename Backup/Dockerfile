FROM alpine:3.22
RUN apk add --no-cache postgresql17-client aws-cli
COPY secrets/credentials /root/.aws/credentials
COPY backup /bin/backup
COPY crontab /etc/crontabs/root
CMD ["/usr/sbin/crond", "-f", "-d", "8"]
