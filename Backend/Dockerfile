FROM rust as build
COPY ./reminders-server ./
RUN cargo build --release
RUN mkdir -p /artefact
RUN cp target/release/reminders-server /artefact/

FROM ubuntu
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get -y install libssl-dev libpq5 libpq-dev && rm -rf /var/lib/apt/lists/*
COPY --from=build /artefact /
CMD /reminders-server
