# React/Vite Frontend Migration Setup

This project is a React/Vite-based Single Page Application template configured to serve as a migration target for the 20,000+ line vanilla Single Page Application (`js/app.js`).

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server (configured to proxy requests on `/api` to the backend on port `8080`):
   ```bash
   npm run dev
   ```
3. Build the application for production:
   ```bash
   npm run build
   ```

## Folder Structure
- `src/components/`: Subcomponents (e.g. Login, Dashboard).
- `src/App.jsx`: Global router and authentication state manager.
- `vite.config.js`: Preconfigured with an API rewrite proxy to make development fast and seamless.
