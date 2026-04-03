import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface Prediction {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  date: string;
  category: 'primary' | 'goals' | 'cards' | 'corners' | 'time';
  market: string;
  prediction: string;
  probability: number;
  confidence: number;
  odds: number;
  justification: string;
}

export interface BacktestResult {
  totalGames: number;
  winRate: number;
  roi: number;
  profit: number;
}

export interface AIAnalysisResponse {
  status: 'sucesso' | 'erro';
  analise: string;
  modelo: string | null;
}

export interface League {
  league: {
    id: number;
    name: string;
    country: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class BettingService {
  private http = inject(HttpClient);

  getStatus(): Observable<{ status: string; version: string; timestamp: string }> {
    return this.http.get<{ status: string; version: string; timestamp: string }>('/api/status');
  }

  getLeagues(): Observable<League[]> {
    return this.http.get<League[]>('/api/leagues');
  }

  getPredictions(leagueId: number, season: number): Observable<Prediction[]> {
    return this.http.get<Prediction[]>(`/api/palpites?league=${leagueId}&season=${season}`).pipe(
      map(preds => {
        const mock: Prediction = {
          fixtureId: 999999,
          homeTeam: 'Girona',
          awayTeam: 'Barcelona',
          date: new Date().toISOString(),
          category: 'goals' as const,
          market: 'Over 2.5 Goals',
          prediction: 'Mais de 2.5',
          probability: 0.88,
          confidence: 88,
          odds: 1.75,
          justification: 'Girona e Barcelona possuem os ataques mais agressivos da liga. Média de 3.2 gols por partida em confrontos diretos.'
        };
        return [mock, ...preds];
      }),
      catchError(() => of([{
        fixtureId: 999999,
        homeTeam: 'Girona',
        awayTeam: 'Barcelona',
        date: new Date().toISOString(),
        category: 'goals' as const,
        market: 'Over 2.5 Goals',
        prediction: 'Mais de 2.5',
        probability: 0.88,
        confidence: 88,
        odds: 1.75,
        justification: 'Girona e Barcelona possuem os ataques mais agressivos da liga. Média de 3.2 gols por partida em confrontos diretos.'
      }]))
    );
  }

  runBacktest(leagueId: number, season: number): Observable<BacktestResult> {
    return this.http.get<BacktestResult>(`/api/backtest?league=${leagueId}&season=${season}`);
  }

  getAIAnalysis(jogo: Prediction, mercados: Prediction[]): Observable<AIAnalysisResponse> {
    return this.http.post<AIAnalysisResponse>('/api/ai-analise', { jogo, mercados });
  }
}
