# Social Care Omaha Backend

This is the backend API for the Social Care Omaha project. It is built using **FastAPI**, **SQLModel**, and **Pydantic**, providing a robust and high-performance API layer.

## Features

- **FastAPI**: High-performance web framework for building APIs.
- **SQLModel**: Library for interacting with SQL databases from Python code, with Python objects.
- **uv**: Extremely fast Python package installer and resolver.

## What this Backend Does

This service acts as the central API for the Social Care Omaha platform. It handles data persistence, business logic, and client communication for social care management operations. It connects to a database to store application data.

## Docker Compose for Development

The project utilizes Docker Compose to streamline the local development environment. We use a split configuration approach:

- `compose.yaml`: Defines the base services required for the application to run (i.e., the FastAPI backend and the database).
- `compose.dev.yaml`: Contains development-specific configurations, such as mock Group Office suite.

## How to Run

### Prerequisites

- Docker and Docker Compose
- uv (Optional, for local non-Docker runs)
- Python 3.13+ (Optional, for local non-Docker runs)

### Running with Docker Compose (Recommended)

To start the application in development mode with the database and hot-reloading enabled:

1. **Start the Stack:**

Run the following command:

```bash
docker compose up -d
```

2. **Access the Application:**

- **API Root:** The backend is accessible at `http://localhost:8000`.
- **Interactive Docs:** Visit `http://localhost:8000/docs` to explore the Swagger UI and test endpoints.

3. **Stop the Stack**:

```bash
docker compose down
```

### Local Development (Without Docker)

1. **Install Dependencies:**

Use `uv` to sync the environment based on `uv.lock`.

```bash
uv sync
```

2. **Run the Application:**

Start the development server with hot-reloading.

```bash
uv run uvicorn src.main:app --reload
```

The API will be available at `http://localhost:8000`.

## Database

If the database needs to be removed:

1. Stop the application.
2. Delete the file `db/omaha.sqlite3`. The backend will automatically recreate the database.
3. Start the application.
