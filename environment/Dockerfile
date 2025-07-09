# hash:sha256:523cdb9691b69e680ce5d42cff4a0f00bc7b71917be72e07cff07bac2691cb5d
ARG REGISTRY_HOST
FROM $REGISTRY_HOST/codeocean/cuda-miniconda-jupyterlab:latest

ARG DEBIAN_FRONTEND=noninteractive

ARG GIT_ASKPASS
ARG GIT_ACCESS_TOKEN
COPY git-askpass /

# Set environment variable for version
ENV VERSION=4.100.3

# Create directory and switch to it
RUN mkdir -p /.code-server && \
    cd /.code-server && \
    curl -fL "https://github.com/coder/code-server/releases/download/v${VERSION}/code-server-${VERSION}-linux-amd64.tar.gz" | tar -xz && \
    ln -s /.code-server/code-server-${VERSION}-linux-amd64/bin/code-server /usr/bin/code-server

# Install missing system libraries required by OpenCV
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libgl1 \
        && apt-get clean && rm -rf /var/lib/apt/lists/*


# copy databook setup files
COPY requirements.txt ./requirements.txt
COPY setup.py ./setup.py
COPY README.md ./README.md
COPY LICENSE.txt ./LICENSE.txt
COPY databook_utils ./databook_utils

# set up databook dependencies
RUN pip install -e ./[dev]