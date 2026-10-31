# Keep the PostgreSQL runtime identical to the deployed 16.14 image.
FROM postgres@sha256:d845e7f0ac8517b9d9868b6d20379f9688ba3676595e50ca7c0b664964b2a760 AS builder
RUN apk add --no-cache build-base git
RUN git clone https://github.com/eulerto/wal2json.git /src/wal2json \
 && cd /src/wal2json \
 && git checkout --detach 1fd8720d0145fba505822727c30cf0c5cc96f66f \
 && make USE_PGXS=1 with_llvm=no
FROM postgres@sha256:d845e7f0ac8517b9d9868b6d20379f9688ba3676595e50ca7c0b664964b2a760
COPY --from=builder /src/wal2json/wal2json.so /usr/local/lib/postgresql/wal2json.so
