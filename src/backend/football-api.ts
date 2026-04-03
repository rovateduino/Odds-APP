import axios from 'axios';
import { CacheManager } from './cache.js';

const API_KEY = process.env['FOOTBALL_API_KEY'] || '';
const BASE_URL = 'https://v3.football.api-sports.io';

export class FootballAPI {
  private static async request<T>(endpoint: string, params: Record<string, unknown> = {}, ttl = 3600): Promise<T | null> {
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    const cached = CacheManager.get<T>(cacheKey);
    if (cached) return cached;

    if (!API_KEY) {
      console.warn('FOOTBALL_API_KEY not set. Returning mock data.');
      return this.getMockData(endpoint) as T;
    }

    try {
      const response = await axios.get(`${BASE_URL}/${endpoint}`, {
        params,
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      });

      const data = response.data.response;
      CacheManager.set(cacheKey, data, ttl);
      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      return null;
    }
  }

  static async getLeagues() {
    return this.request<unknown[]>('leagues', {}, 86400); // 24h
  }

  static async getFixtures(leagueId: number, season: number) {
    return this.request<unknown[]>('fixtures', { league: leagueId, season }, 3600); // 1h
  }

  static async getStandings(leagueId: number, season: number) {
    return this.request<unknown[]>('standings', { league: leagueId, season }, 3600);
  }

  static async getPredictions(fixtureId: number) {
    return this.request<unknown[]>('predictions', { fixture: fixtureId }, 86400);
  }

  private static getMockData(endpoint: string): unknown {
    // Basic mock data for demo if no key is provided
    if (endpoint === 'leagues') {
      return [{ league: { id: 71, name: 'Serie A', country: 'Brazil' } }];
    }
    return [];
  }
}
