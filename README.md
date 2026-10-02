# React + Vite

<<<<<<< HEAD
This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.
=======
React and TypeScript web client for **MedSync / CATMS**, with Vite tooling, React Router navigation, and an Axios client for backend communication.
>>>>>>> origin/main

Currently, two official plugins are available:

<<<<<<< HEAD
- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)
=======
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Routing & API Client**: React Router & Axios
- **Styling**: CSS
- **Container / Web Server**: Docker & Nginx
>>>>>>> origin/main

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

<<<<<<< HEAD
If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
=======
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
>>>>>>> origin/main
