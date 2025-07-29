import { Plugin } from 'vite';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

export function saveStatePlugin(): Plugin {
  return {
    name: 'save-state',
    configureServer(server) {
      server.middlewares.use('/api/save-export-state', async (req, res, next) => {
        if (req.method !== 'POST') {
          return next();
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const state = JSON.parse(body);
            const filePath = resolve(process.cwd(), '.static-export-state.json');
            writeFileSync(filePath, JSON.stringify(state, null, 2));
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to save state' }));
          }
        });
      });
    }
  };
}