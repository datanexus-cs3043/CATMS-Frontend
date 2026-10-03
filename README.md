# CATMS-Frontend

React and TypeScript web client for **MedSync / CATMS**, with Vite tooling, React Router navigation, and an Axios client for backend communication.

## Technical Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Routing & API Client**: React Router & Axios
- **Styling**: CSS
- **Container / Web Server**: Docker & Nginx

## Repository Structure

```text
CATMS-Frontend/
├── src/             # React components, pages, and application layout
├── public/          # Static web assets
├── Dockerfile       # Production multi-stage Nginx container build
├── nginx.conf       # Nginx server configuration
└── .env.example     # Environment variable configuration template
```

## Execution Guide

### Option 1: Local Development Server

1. Install npm dependencies:
   ```bash
   npm install
   ```
2. Copy sample environment file:
   ```bash
   cp .env.example .env
   ```

   Set `VITE_API_BASE_URL` to the backend API URL, including `/api` (for example, `http://localhost:8000/api`). Run the backend separately for API access.

3. Launch Vite development server:
   ```bash
   npm run dev
   ```

The application will be accessible at `http://localhost:5173`.

### Option 2: Production Docker Container

```bash
# Build the docker image
docker build -t catms-frontend .
# Run that image (container)
docker run -p 5173:80 catms-frontend
```

## Central Documentation

For complete system architecture blueprints and development guidelines, visit the **[project-docs Repository](https://github.com/datanexus-cs3043/project-docs)**.
