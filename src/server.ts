import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { BettingAnalyzer } from './backend/analyzer.js';
import { FootballAPI } from './backend/football-api.js';
import { AIAnalyzer } from './backend/ai-analyzer.js';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * API Endpoints
 */
app.get('/api/status', (_req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/leagues', async (_req, res) => {
  try {
    const leagues = await FootballAPI.getLeagues();
    res.json(leagues);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

app.get('/api/palpites', async (req, res) => {
  const leagueId = parseInt(req.query['league'] as string) || 71;
  const season = parseInt(req.query['season'] as string) || 2024;
  
  try {
    const predictions = await BettingAnalyzer.analyzeLeague(leagueId, season);
    res.json(predictions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

app.get('/api/backtest', async (req, res) => {
  const leagueId = parseInt(req.query['league'] as string) || 71;
  const season = parseInt(req.query['season'] as string) || 2024;

  try {
    const results = await BettingAnalyzer.runBacktest(leagueId, season);
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to run backtest' });
  }
});

app.post('/api/ai-analise', express.json(), async (req, res) => {
  const { jogo, mercados } = req.body;
  
  if (!jogo || !mercados) {
    res.status(400).json({ error: 'Jogo and mercados are required' });
    return;
  }

  try {
    const analysis = await AIAnalyzer.gerarAnaliseIA(jogo, mercados);
    res.json(analysis);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate AI analysis' });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
