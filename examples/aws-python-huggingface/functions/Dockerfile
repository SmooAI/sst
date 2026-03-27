ARG UV_VERSION=0.11.2
ARG PYTHON_VERSION=3.12

FROM ghcr.io/astral-sh/uv:${UV_VERSION} AS uv

FROM public.ecr.aws/lambda/python:${PYTHON_VERSION} AS builder

ENV UV_COMPILE_BYTECODE=1
ENV UV_NO_INSTALLER_METADATA=1
ENV UV_LINK_MODE=copy

COPY --from=uv /uv /bin/uv

RUN if command -v dnf > /dev/null 2>&1; then \
      dnf install -y git gcc gcc-c++ openssl-devel python3-devel curl && dnf clean all; \
    elif command -v yum > /dev/null 2>&1; then \
      yum install -y git gcc gcc-c++ openssl-devel python3-devel curl && yum clean all; \
    fi

RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /build

COPY requirements-third-party.txt ./requirements-third-party.txt
RUN if grep -Eq '^[^#[:space:]]' requirements-third-party.txt; then \
      uv pip install -r requirements-third-party.txt --target "${LAMBDA_TASK_ROOT}" --system --no-verify-hashes; \
    fi

COPY requirements.txt ./requirements.txt
COPY deps/ ./
RUN if grep -Eq '^[^#[:space:]]' requirements.txt; then \
      uv pip install -r requirements.txt --target "${LAMBDA_TASK_ROOT}" --system --no-verify-hashes; \
    fi

FROM public.ecr.aws/lambda/python:${PYTHON_VERSION}

ENV HF_HOME=/tmp/transformers_cache

COPY --from=builder ${LAMBDA_TASK_ROOT} ${LAMBDA_TASK_ROOT}
COPY . ${LAMBDA_TASK_ROOT}

RUN rm -rf \
      ${LAMBDA_TASK_ROOT}/deps \
      ${LAMBDA_TASK_ROOT}/Dockerfile \
      ${LAMBDA_TASK_ROOT}/requirements.txt \
      ${LAMBDA_TASK_ROOT}/requirements-third-party.txt \
      ${LAMBDA_TASK_ROOT}/pyproject.toml \
      ${LAMBDA_TASK_ROOT}/uv.lock

# No need to configure the handler or entrypoint - SST will do that
