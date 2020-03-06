FROM alpine
RUN apk add --no-cache postgresql-client --repository=http://dl-cdn.alpinelinux.org/alpine/edge/main
RUN apk add --no-cache python py-pip && \
	pip install awscli && \
	apk del py-pip
COPY secrets/credentials /root/.aws/credentials
COPY backup /bin/backup
COPY crontab /etc/crontabs/root
CMD ["/usr/sbin/crond", "-f", "-d", "8"]
