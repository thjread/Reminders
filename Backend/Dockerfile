FROM rust as build

RUN USER=root cargo new --bin reminders-server
WORKDIR /reminders-server
COPY ./reminders-server/Cargo.lock ./Cargo.lock
COPY ./reminders-server/Cargo.toml ./Cargo.toml
RUN cargo build --release

RUN rm src/*.rs
COPY ./reminders-server/src ./src
COPY ./reminders-server/migrations ./migrations

RUN rm ./target/release/deps/reminders_server*
RUN cargo build --release
RUN mkdir -p /artefact
RUN cp ./target/release/reminders-server /artefact/

FROM ubuntu
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get -y install libssl-dev libpq5 libpq-dev && rm -rf /var/lib/apt/lists/*
COPY --from=build /artefact /
COPY env .env
CMD /reminders-server
