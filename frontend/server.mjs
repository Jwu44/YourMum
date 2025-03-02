// For local development only - this file won't be used in Vercel production
import next from 'next';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Only use HTTPS for local development
if (dev) {
  try {
    const httpsOptions = {
      key: fs.readFileSync(path.join(__dirname, 'certificates', 'localhost.key')),
      cert: fs.readFileSync(path.join(__dirname, 'certificates', 'localhost.crt')),
    };

    app.prepare().then(() => {
      https.createServer(httpsOptions, (req, res) => {
        handle(req, res);
      }).listen(8001, (err) => {
        if (err) throw err;
        console.log('> Ready on https://localhost:8001');
      });
    });
  } catch (error) {
    console.error('Failed to start HTTPS server:', error);
    // Fallback to standard Next.js dev server
    app.prepare().then(() => {
      console.log('> Ready on http://localhost:3000');
    });
  }
} else {
  // In production (Vercel), this file won't be used
  // Next.js will be started by Vercel's platform
  app.prepare().then(() => {
    console.log('> Production build ready');
  });
}