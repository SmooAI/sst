ARG UV_VERSION=0.11.2
ARG PYTHON_VERSION=3.11

FROM ghcr.io/astral-sh/uv:${UV_VERSION} AS uv

FROM public.ecr.aws/lambda/python:${PYTHON_VERSION} AS builder

ENV UV_COMPILE_BYTECODE=1
ENV UV_NO_INSTALLER_METADATA=1
ENV UV_LINK_MODE=copy

COPY --from=uv /uv /bin/uv

RUN if command -v dnf > /dev/null 2>&1; then \
      dnf install -y git gcc python3-devel && dnf clean all; \
    elif command -v yum > /dev/null 2>&1; then \
      yum install -y git gcc python3-devel && yum clean all; \
    fi

WORKDIR /build

COPY requirements-third-party.txt ./requirements-third-party.txt
RUN if grep -Eq '^[^#[:space:]]' requirements-third-party.txt; then \
      uv pip install -r requirements-third-party.txt --target "${LAMBDA_TASK_ROOT}" --system; \
    fi

COPY requirements.txt ./requirements.txt
COPY deps/ ./
RUN if grep -Eq '^[^#[:space:]]' requirements.txt; then \
      uv pip install -r requirements.txt --target "${LAMBDA_TASK_ROOT}" --system; \
    fi

FROM public.ecr.aws/lambda/python:${PYTHON_VERSION}

COPY --from=builder ${LAMBDA_TASK_ROOT} ${LAMBDA_TASK_ROOT}
COPY . ${LAMBDA_TASK_ROOT}

# Perform any custom image setup here.

RUN rm -rf \
      ${LAMBDA_TASK_ROOT}/deps \
      ${LAMBDA_TASK_ROOT}/Dockerfile \
      ${LAMBDA_TASK_ROOT}/requirements.txt \
      ${LAMBDA_TASK_ROOT}/requirements-third-party.txt \
      ${LAMBDA_TASK_ROOT}/pyproject.toml \
      ${LAMBDA_TASK_ROOT}/uv.lock

# No need to configure the handler or entrypoint - SST will do that
