import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Observable, from, map, of, tap, catchError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GeminiAIService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  
  private CACHE_KEY_PREFIX = 'gemini_cache_';
  private CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  private getAI() {
    // GEMINI_API_KEY is declared globally in src/globals.d.ts
    // and injected via cross-env in package.json
    const apiKey = typeof GEMINI_API_KEY !== 'undefined' ? GEMINI_API_KEY : '';
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not found. Please set it in your environment.');
    }
    return new GoogleGenAI({ apiKey });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analyzeTeam(teamName: string, stats: any): Observable<string> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${teamName.toLowerCase().replace(/\s+/g, '_')}`;
    
    if (this.isBrowser) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < this.CACHE_DURATION) {
          return of(data);
        }
      }
    }

    const prompt = `Analise o time ${teamName} para apostas esportivas:
    - Últimos 5 jogos: ${stats.form.join(', ')}
    - Média de gols: ${stats.goalsFor} marcados, ${stats.goalsAgainst} sofridos
    - Escanteios: ${stats.corners}
    - Cartões: ${stats.cards}
    
    Responda em português com:
    1. Resumo (max 80 palavras)
    2. Top 3 melhores mercados para apostar
    3. Recomendação final com stake (1-10)`;

    const ai = this.getAI();
    return from(ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    })).pipe(
      map((response: GenerateContentResponse) => response.text || 'Análise indisponível no momento.'),
      tap(text => {
        if (this.isBrowser) {
          localStorage.setItem(cacheKey, JSON.stringify({
            data: text,
            timestamp: Date.now()
          }));
        }
      }),
      catchError(error => {
        console.error('Erro na API Gemini:', error);
        return of('Erro ao gerar análise com IA. Verifique sua chave de API.');
      })
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analyzeMatch(homeTeam: string, awayTeam: string, statsCasa: any, statsFora: any, h2h: string): Observable<string> {
    const prompt = `
    Analise o confronto: ${homeTeam} vs ${awayTeam}
    
    Dados do ${homeTeam}:
    - Últimos 5: ${statsCasa.form.join(', ')}
    - Média gols: ${statsCasa.goalsFor} marcados, ${statsCasa.goalsAgainst} sofridos
    - Mandante: ${statsCasa.homeAdvantage || 'Bom desempenho em casa'}
    
    Dados do ${awayTeam}:
    - Últimos 5: ${statsFora.form.join(', ')}
    - Média gols: ${statsFora.goalsFor} marcados, ${statsFora.goalsAgainst} sofridos
    - Visitante: ${statsFora.awayDisadvantage || 'Desempenho regular fora'}
    
    Histórico confrontos:
    ${h2h}
    
    Gere em português:
    1. Resumo da análise (máx 100 palavras)
    2. 3 melhores palpites para este jogo
    3. Recomendação final (Aposta Forte/Moderada/Pequena)
    `;

    const ai = this.getAI();
    return from(ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    })).pipe(
      map((response: GenerateContentResponse) => response.text || 'Análise indisponível no momento.'),
      catchError(error => {
        console.error('Erro na API Gemini:', error);
        return of('Erro ao gerar análise com IA. Verifique sua chave de API.');
      })
    );
  }
}
