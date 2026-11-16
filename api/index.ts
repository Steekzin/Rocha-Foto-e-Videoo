// Set serverless environment flags BEFORE loading any server logic
process.env.IS_SERVERLESS = 'true';
process.env.VERCEL = process.env.VERCEL || '1';
process.env.NODE_ENV = 'production';

import app from '../server.js';

export default async function handler(req: any, res: any): Promise<void> {
  // Add CORS headers immediately
  if (res && res.setHeader) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-token');
  }

  if (req && req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Reconstruct full URL & preserve all query params (like ?all=true, ?category=..., ?count=...)
    const rawUrl = typeof req?.url === 'string' && req.url.length > 0 ? req.url : '/api';
    const urlObj = new URL(rawUrl, 'http://localhost');

    // Merge req.query if Vercel populated it separately
    if (req?.query && typeof req.query === 'object') {
      for (const [k, v] of Object.entries(req.query)) {
        if (v !== undefined && !urlObj.searchParams.has(k)) {
          if (Array.isArray(v)) {
            v.forEach((item) => urlObj.searchParams.append(k, String(item)));
          } else {
            urlObj.searchParams.set(k, String(v));
          }
        }
      }
    }

    const pathParam = urlObj.searchParams.get('path');
    const portfolioPathParam = urlObj.searchParams.get('portfolioPath');

    const vercelMatched =
      req?.headers?.['x-matched-path'] ||
      req?.headers?.['x-vercel-matched-path'] ||
      req?.headers?.['x-invoke-path'] ||
      req?.headers?.['x-forwarded-uri'];

    if (pathParam) {
      urlObj.searchParams.delete('path');
      const qs = urlObj.searchParams.toString();
      const cleanPath = pathParam.replace(/^\/+/, '');
      req.url = `/api/${cleanPath}${qs ? `?${qs}` : ''}`;
    } else if (portfolioPathParam) {
      urlObj.searchParams.delete('portfolioPath');
      const qs = urlObj.searchParams.toString();
      const cleanPath = portfolioPathParam.replace(/^\/+/, '');
      req.url = `/portfolio/${cleanPath}${qs ? `?${qs}` : ''}`;
    } else if (
      typeof vercelMatched === 'string' &&
      vercelMatched.startsWith('/api') &&
      !vercelMatched.startsWith('/api?') &&
      vercelMatched !== '/api'
    ) {
      const qs = urlObj.searchParams.toString();
      const matchedBase = vercelMatched.split('?')[0];
      req.url = `${matchedBase}${qs ? `?${qs}` : ''}`;
    } else if (
      req?.url &&
      !req.url.startsWith('/api') &&
      !req.url.startsWith('/portfolio') &&
      !req.url.startsWith('/public')
    ) {
      req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
    }

    req.originalUrl = req.url;

    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      if (res && typeof res.once === 'function') {
        res.once('finish', done);
        res.once('close', done);
      }

      app(req, res, (err: any) => {
        if (err && res && !res.headersSent) {
          res.status(err.status || err.statusCode || 500).json({
            error: err.message || 'Erro interno no servidor.',
            status: err.status || err.statusCode || 500,
          });
        }
        done();
      });
    });
  } catch (err: any) {
    console.error('[API Handler Error]:', err);
    if (res && !res.headersSent) {
      res.status(500).json({
        error: 'Erro no manipulador do servidor: ' + (err?.message || String(err)),
        status: 500,
      });
    }
  }
}
