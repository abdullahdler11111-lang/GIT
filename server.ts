import express from "express";
import path from "path";
import { fileURLToPath } from "url";

// Define __dirname and __filename for both ESM (dev) and CJS (production bundle)
const _filename = typeof __filename !== 'undefined' 
  ? __filename 
  : fileURLToPath(import.meta.url);

const _dirname = typeof __dirname !== 'undefined' 
  ? __dirname 
  : path.dirname(_filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Working directory: ${process.cwd()}`);
  console.log(`Serving from directory: ${_dirname}`);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV,
      time: new Date().toISOString()
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, server.cjs is in the dist folder
    // When bundled with esbuild --outfile=dist/server.cjs, _dirname will be the absolute path to /dist
    const distPath = _dirname;
    
    // Check if dist/index.html exists to avoid 404s on start
    app.use(express.static(distPath));
    
    // SPA fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
