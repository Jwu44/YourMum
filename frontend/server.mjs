import next from 'next';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

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