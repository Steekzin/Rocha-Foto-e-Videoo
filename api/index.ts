// Set serverless environment flags BEFORE loading any server logic
process.env.IS_SERVERLESS = 'true';
process.env.VERCEL = process.env.VERCEL || '1';
process.env.NODE_ENV = 'production';

import app from '../server.ts';

// Crucial for Vercel Serverless: Disable internal body parser so Multer/Express can stream multipart files
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default function handler(req: any, res: any) {
  // Add CORS headers immediately
  if (res && res.setHeader) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-token');
  }

  if (req && req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Reconstruct full URL if Vercel rewrite altered req.url
    const vercelMatched =
      req.headers['x-matched-path'] ||
      req.headers['x-vercel-matched-path'] ||
      req.headers['x-invoke-path'] ||
      req.headers['x-forwarded-uri'];

    if (req.query && req.query.path) {
      const p = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
      req.url = `/api/${p.replace(/^\/+/, '')}`;
    } else if (req.query && req.query.portfolioPath) {
      const p = Array.isArray(req.query.portfolioPath) ? req.query.portfolioPath.join('/') : req.query.portfolioPath;
      req.url = `/portfolio/${p.replace(/^\/+/, '')}`;
    } else if (vercelMatched && typeof vercelMatched === 'string' && vercelMatched.startsWith('/api')) {
      req.url = vercelMatched;
    } else if (
      req &&
      req.url &&
      !req.url.startsWith('/api') &&
      !req.url.startsWith('/portfolio') &&
      !req.url.startsWith('/public')
    ) {
      req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
    }

    return app(req, res);
  } catch (err: any) {
    console.error('[API Handler Error]:', err);
    if (res && !res.headersSent) {
      return res.status(500).json({
        error: 'Erro no manipulador do servidor: ' + (err.message || String(err)),
        status: 500,
      });
    }
  }
}
