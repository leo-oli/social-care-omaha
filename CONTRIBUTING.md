# Contributing to Omaha System Clinical Documentation App

Thank you for your interest in contributing! We welcome contributions from the community to help improve this clinical documentation tool.

## Development Workflow

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Setting up the Environment

#### 1. Fork

Fork and clone the repository.

#### 2. Environment Variables

Copy and edit the example environment file in the `frontend/` and `backend/` directories.

#### 3. Start the Application

We use Docker Compose to orchestrate the frontend and backend services.

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`

### Submitting Changes

1. Create a new branch for your feature or bugfix.
2. Make your changes.
3. Ensure the application builds and runs locally.
4. Commit your changes with clear, descriptive messages.
5. Push to your fork and submit a **Pull Request**.

## Code Style

- **Frontend**: React functional components with Hooks. Follow the existing CSS naming conventions (`BEM`-like).
- **Backend**: Python FastAPI standards (PEP 8).

## Reporting Bugs

Please use the GitHub Issues tab to report bugs. Include the browser version, steps to reproduce, and any relevant console errors.
