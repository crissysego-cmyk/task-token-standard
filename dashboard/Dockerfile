FROM node:22-bookworm

# Python3 for the zero-dependency verification toolchain (pack.py / verify.py / tom.py)
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 \
 && rm -rf /var/lib/apt/lists/*

# Global CLI tools the e2e lifecycle test needs (local_e2e.sh)
RUN npm install -g solc@0.8.24 ganache@7.9.2

WORKDIR /app
