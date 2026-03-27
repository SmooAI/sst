ARG UV_VERSION=0.11.2
ARG PYTHON_VERSION=3.11

FROM ghcr.io/astral-sh/uv:${UV_VERSION} AS uv

FROM public.ecr.aws/lambda/python:${PYTHON_VERSION} AS builder

ENV UV_COMPILE_BYTECODE=1
ENV UV_NO_INSTALLER_METADATA=1
ENV UV_LINK_MODE=copy

COPY --from=uv /uv /bin/uv

# Install git for git-based dependencies and build tools for native extensions.
# Python <=3.11 uses AL2 (yum); Python >=3.12 uses AL2023 (dnf).
RUN if command -v dnf > /dev/null 2>&1; then \
      dnf install -y git gcc python3-devel && dnf clean all; \
    elif command -v yum > /dev/null 2>&1; then \
      yum install -y git gcc python3-devel && yum clean all; \
    fi

WORKDIR /build

# Install third-party dependencies first so source-only changes reuse the cache.
COPY requirements-third-party.txt ./requirements-third-party.txt
RUN if grep -Eq '^[^#[:space:]]' requirements-third-party.txt; then \
      uv pip install -r requirements-third-party.txt --target "${LAMBDA_TASK_ROOT}" --system; \
    fi

# Install local path dependencies from deps/ using the full requirements export.
COPY requirements.txt ./requirements.txt
COPY deps/ ./
RUN if grep -Eq '^[^#[:space:]]' requirements.txt; then \
      uv pip install -r requirements.txt --target "${LAMBDA_TASK_ROOT}" --system; \
    fi

FROM public.ecr.aws/lambda/python:${PYTHON_VERSION} AS source

WORKDIR /src
COPY . .
RUN rm -rf deps Dockerfile requirements.txt requirements-third-party.txt pyproject.toml uv.lock

FROM public.ecr.aws/lambda/python:${PYTHON_VERSION}

COPY --from=builder ${LAMBDA_TASK_ROOT} ${LAMBDA_TASK_ROOT}
COPY --from=source /src/ ${LAMBDA_TASK_ROOT}

# No need to configure the handler or entrypoint - SST will do that
