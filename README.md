# CATMS-Frontend

Frontend client application for **MedSync / CATMS** built with React and Vite.

## Technical Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
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
3. Launch Vite development server:
   ```bash
   npm run dev
   ```

The application will be accessible at `http://localhost:5173`.

### Option 2: Production Docker Container

```bash
docker build -t catms-frontend .
docker run -p 5173:80 catms-frontend
```

## Central Documentation

For complete system architecture blueprints and development guidelines, visit the **[project-docs Repository](https://github.com/datanexus-cs3043/project-docs)**.
