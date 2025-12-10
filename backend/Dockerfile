# Use the official Python image.
FROM python:3.13-slim

# Set the working directory in the container.
WORKDIR /app

# Set environment variables.
ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1

# Install uv from the official image.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy the dependency definitions
COPY pyproject.toml uv.lock ./

# Install dependencies.
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

# Add the virtual environment to the PATH.
ENV PATH="/app/.venv/bin:$PATH"

# Copy the rest of the application's source code.
COPY src/ ./src/
COPY db/ ./db/

# Install the project itself.
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# Create a non-root user.
RUN useradd -m appuser && chown -R appuser /app
USER appuser

# Expose the port the app runs on.
EXPOSE 8000

# Command to run the application.
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
