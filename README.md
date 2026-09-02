# CATMS-Frontend

Frontend client for MedSync / CATMS built with React and Vite.

## Tech Stack
- React + Vite
- Tailwind CSS

## Project Structure
```text
CATMS-Frontend/
├── src/             # React components and pages
├── public/          # Static assets
├── Dockerfile       # Production container build
├── nginx.conf       # Nginx config for Docker
└── .env.example     # Sample environment variables
```

## Running the Project

### Running Locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy sample environment variables:
   ```bash
   cp .env.example .env
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

The app will be accessible at `http://localhost:5173`.

### Running with Docker
```bash
docker build -t catms-frontend .
docker run -p 5173:80 catms-frontend
```
