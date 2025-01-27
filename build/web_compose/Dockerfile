# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


FROM gcr.io/datcom-ci/python-node-go-protoc-envoy:2023-10-05

ARG ENV
ARG PIP_DISABLE_PIP_VERSION_CHECK=1
ARG PIP_NO_CACHE_DIR=1
ENV ENV=${ENV}

WORKDIR /workspace

# Docker cache: Download modules
COPY mixer/go.mod mixer/go.sum ./
RUN go mod download -x

# Copy files
COPY mixer/proto/ proto
COPY mixer/internal/ internal

# Build protobuf
RUN protoc \
  --include_source_info \
  --include_imports \
  --proto_path=proto \
  --go_out=paths=source_relative:internal/proto \
  --go-grpc_out=paths=source_relative:internal/proto \
  --go-grpc_opt=require_unimplemented_servers=false \
  --experimental_allow_proto3_optional \
  --descriptor_set_out mixer-grpc.pb \
  proto/*.proto proto/**/*.proto

# Adding the grpc_health_probe
RUN GRPC_HEALTH_PROBE_VERSION=v0.4.7 && \
  wget -qO/bin/grpc_health_probe https://github.com/grpc-ecosystem/grpc-health-probe/releases/download/${GRPC_HEALTH_PROBE_VERSION}/grpc_health_probe-linux-amd64 && \
  chmod +x /bin/grpc_health_probe

# Build binary
COPY mixer/cmd/ cmd
COPY mixer/esp/ esp
ENV CGO_ENABLED=1
RUN go build -o /go/bin/mixer cmd/main.go

# Website Server
COPY web_app.py /workspace/web_app.py
COPY server/requirements.txt /workspace/server/requirements.txt
RUN pip install --upgrade pip
RUN pip install --upgrade setuptools
RUN pip3 install -r /workspace/server/requirements.txt

# NL Server
COPY nl_app.py /workspace/nl_app.py
COPY deploy/nl/. /datacommons/nl/
COPY nl_server/requirements.txt /workspace/nl_server/requirements.txt
RUN pip install --upgrade pip setuptools light-the-torch
RUN ltt install torch --cpuonly
RUN pip3 install -r /workspace/nl_server/requirements.txt

# Import Tool
COPY import/simple/requirements.txt /workspace/import/simple/requirements.txt
RUN pip3 install -r /workspace/import/simple/requirements.txt

# Embeddings Tool
COPY tools/nl/embeddings/requirements.txt /workspace/tools/nl/embeddings/requirements.txt
RUN pip3 install -r /workspace/tools/nl/embeddings/requirements.txt

# Install website NPM dependencies
COPY packages/web-components/package.json /workspace/packages/web-components/package.json
COPY packages/web-components/package-lock.json /workspace/packages/web-components/package-lock.json
RUN npm --prefix /workspace/packages/web-components install --omit=dev

COPY static/package.json /workspace/static/package.json
COPY static/package-lock.json /workspace/static/package-lock.json
RUN npm --prefix /workspace/static install --omit=dev

# Install packages NPM depenencies
COPY packages/. /workspace/packages/
COPY static/. /workspace/static/

# Build Static Files
WORKDIR /workspace/static
RUN npm run-script build

WORKDIR /workspace

# Flask
COPY server/. /workspace/server/
COPY shared/. /workspace/shared/

# NL Server
COPY nl_server/. /workspace/nl_server/
COPY deploy/nl/. /workspace/deploy/nl/

# Import Tool
COPY import/. /workspace/import/

# Embeddings Tool
COPY tools/nl/embeddings/. /workspace/tools/nl/embeddings/

# Download model and embeddings
WORKDIR /workspace/tools/nl/embeddings
RUN python build_custom_dc_embeddings.py --mode=download

WORKDIR /workspace


# Env that should not change
ENV USE_LOCAL_MIXER=true
ENV ENV_PREFIX=Compose
ENV ENABLE_ADMIN=true


# Env that can be set from `docker run`
ENV DEBUG=false
ENV USE_SQLITE=false
ENV USE_CLOUDSQL=false
ENV DC_API_ROOT=https://api.datacommons.org
ENV ENABLE_MODEL=false

COPY build/web_compose/compose.sh .
EXPOSE 6060 8080 8081
CMD ./compose.sh
