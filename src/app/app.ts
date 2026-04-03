import { ChangeDetectionStrategy, Component, signal, inject, effect, PLATFORM_ID, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { GeminiAIService } from './gemini-ai.service';

interface TeamData {
  id?: number;
  name?: string;
  league: string;
  form: string[];
  goalsFor: number;
  goalsAgainst: number;
  corners: number;
  cards: number;
  stats: { v: number; e: number; d: number };
  logo?: string;
  homeAdvantage?: string;
  awayDisadvantage?: string;
}

interface MarketItem {
  label: string;
  value: number;
}

interface Market {
  title: string;
  icon: string;
  items: MarketItem[];
}

interface Recommendation {
  title: string;
  confidence: number;
  risk: string;
  stake: string;
}

interface Game {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  date: string;
  time: string;
  dayOfWeek: string;
  venue: string;
  odds: { home: number; draw: number; away: number };
  probs: { home: number; draw: number; away: number };
  palpite: string;
  confianca: number;
  resumo: string;
}

interface FootballApiResponse {
  errors: string[] | Record<string, string> | null;
  response: {
    fixture: { id: number, date: string, venue: { name: string } },
    teams: { home: { name: string, logo: string }, away: { name: string, logo: string } }
  }[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    HttpClientModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private geminiService = inject(GeminiAIService);
  private footballApiKey = typeof FOOTBALL_API_KEY !== 'undefined' ? FOOTBALL_API_KEY : '';

  // Mock Data Expandida
  teamsData: Record<string, TeamData> = {
    "Barcelona": { league: "Espanha - La Liga", form: ["V", "V", "V", "E", "V"], goalsFor: 2.4, goalsAgainst: 0.8, corners: 6.8, cards: 3.2, stats: { v: 4, e: 1, d: 0 } },
    "Real Madrid": { league: "Espanha - La Liga", form: ["V", "V", "E", "V", "V"], goalsFor: 2.2, goalsAgainst: 1.0, corners: 7.2, cards: 3.5, stats: { v: 4, e: 1, d: 0 } },
    "PSG": { league: "França - Ligue 1", form: ["V", "V", "V", "V", "E"], goalsFor: 3.0, goalsAgainst: 0.9, corners: 8.0, cards: 2.8, stats: { v: 4, e: 1, d: 0 } },
    "Bayern": { league: "Alemanha - Bundesliga", form: ["V", "D", "V", "V", "V"], goalsFor: 2.8, goalsAgainst: 1.2, corners: 7.5, cards: 2.5, stats: { v: 4, e: 0, d: 1 } },
    "Manchester City": { league: "Inglaterra - Premier League", form: ["V", "V", "V", "E", "V"], goalsFor: 2.6, goalsAgainst: 0.7, corners: 8.5, cards: 1.8, stats: { v: 4, e: 1, d: 0 } },
    "Liverpool": { league: "Inglaterra - Premier League", form: ["V", "E", "V", "V", "V"], goalsFor: 2.3, goalsAgainst: 1.1, corners: 7.8, cards: 2.2, stats: { v: 4, e: 1, d: 0 } },
    // Brasileirão
    "Flamengo": { league: "Brasil - Série A", form: ["V", "V", "E", "V", "V"], goalsFor: 2.1, goalsAgainst: 0.9, corners: 6.5, cards: 2.4, stats: { v: 4, e: 1, d: 0 } },
    "Palmeiras": { league: "Brasil - Série A", form: ["V", "E", "V", "V", "D"], goalsFor: 1.9, goalsAgainst: 0.7, corners: 7.2, cards: 2.8, stats: { v: 3, e: 1, d: 1 } },
    "Corinthians": { league: "Brasil - Série A", form: ["E", "D", "V", "E", "V"], goalsFor: 1.2, goalsAgainst: 1.1, corners: 5.8, cards: 3.5, stats: { v: 2, e: 2, d: 1 } },
    "São Paulo": { league: "Brasil - Série A", form: ["V", "E", "D", "V", "E"], goalsFor: 1.5, goalsAgainst: 1.2, corners: 6.0, cards: 3.0, stats: { v: 2, e: 2, d: 1 } },
    "Internacional": { league: "Brasil - Série A", form: ["V", "V", "D", "E", "V"], goalsFor: 1.6, goalsAgainst: 1.0, corners: 6.2, cards: 3.2, stats: { v: 3, e: 1, d: 1 } },
    "Grêmio": { league: "Brasil - Série A", form: ["D", "V", "V", "E", "D"], goalsFor: 1.4, goalsAgainst: 1.4, corners: 5.5, cards: 3.8, stats: { v: 2, e: 1, d: 2 } },
    "Santos": { league: "Brasil - Série B", form: ["V", "V", "V", "D", "E"], goalsFor: 1.8, goalsAgainst: 0.9, corners: 5.9, cards: 2.5, stats: { v: 3, e: 1, d: 1 } },
    "Cruzeiro": { league: "Brasil - Série A", form: ["E", "V", "D", "V", "V"], goalsFor: 1.3, goalsAgainst: 1.0, corners: 5.7, cards: 2.9, stats: { v: 3, e: 1, d: 1 } },
    // Inglaterra
    "Arsenal": { league: "Inglaterra - Premier League", form: ["V", "V", "V", "V", "E"], goalsFor: 2.5, goalsAgainst: 0.8, corners: 7.0, cards: 1.9, stats: { v: 4, e: 1, d: 0 } },
    "Chelsea": { league: "Inglaterra - Premier League", form: ["E", "V", "D", "V", "E"], goalsFor: 1.7, goalsAgainst: 1.5, corners: 6.1, cards: 3.1, stats: { v: 2, e: 2, d: 1 } },
    "Tottenham": { league: "Inglaterra - Premier League", form: ["V", "D", "V", "E", "V"], goalsFor: 2.0, goalsAgainst: 1.4, corners: 6.8, cards: 2.6, stats: { v: 3, e: 1, d: 1 } },
    "Manchester United": { league: "Inglaterra - Premier League", form: ["D", "E", "V", "D", "V"], goalsFor: 1.4, goalsAgainst: 1.6, corners: 5.8, cards: 2.8, stats: { v: 2, e: 1, d: 2 } },
    "Newcastle": { league: "Inglaterra - Premier League", form: ["V", "E", "V", "V", "D"], goalsFor: 1.9, goalsAgainst: 1.3, corners: 6.4, cards: 2.7, stats: { v: 3, e: 1, d: 1 } },
    // Itália
    "Internazionale": { league: "Itália - Serie A", form: ["V", "V", "V", "V", "V"], goalsFor: 2.3, goalsAgainst: 0.6, corners: 6.5, cards: 2.1, stats: { v: 5, e: 0, d: 0 } },
    "Milan": { league: "Itália - Serie A", form: ["V", "E", "V", "V", "D"], goalsFor: 1.9, goalsAgainst: 1.1, corners: 6.0, cards: 2.5, stats: { v: 3, e: 1, d: 1 } },
    "Juventus": { league: "Itália - Serie A", form: ["V", "V", "E", "E", "V"], goalsFor: 1.5, goalsAgainst: 0.7, corners: 5.5, cards: 2.8, stats: { v: 3, e: 2, d: 0 } },
    "Napoli": { league: "Itália - Serie A", form: ["D", "V", "E", "V", "V"], goalsFor: 1.8, goalsAgainst: 1.2, corners: 6.3, cards: 2.4, stats: { v: 3, e: 1, d: 1 } },
    // Alemanha
    "Borussia Dortmund": { league: "Alemanha - Bundesliga", form: ["V", "D", "V", "E", "V"], goalsFor: 2.1, goalsAgainst: 1.3, corners: 6.7, cards: 2.3, stats: { v: 3, e: 1, d: 1 } },
    "Bayer Leverkusen": { league: "Alemanha - Bundesliga", form: ["V", "V", "V", "V", "V"], goalsFor: 2.7, goalsAgainst: 0.8, corners: 7.1, cards: 2.0, stats: { v: 5, e: 0, d: 0 } },
  };

  leagues = computed(() => {
    const grouped: Record<string, string[]> = {};
    Object.entries(this.teamsData).forEach(([name, data]) => {
      if (!grouped[data.league]) grouped[data.league] = [];
      grouped[data.league].push(name);
    });
    return grouped;
  });

  leagueNames = computed(() => Object.keys(this.leagues()));
  selectedLeague = signal<string | null>(null);

  searchTerm = signal('');
  showResults = signal(false);
  loading = signal(false);
  selectedTeam = signal<TeamData | null>(null);
  aiAnalysis = signal<string>('');
  markets = signal<Market[]>([]);
  finalRec = signal<Recommendation | null>(null);

  // Novas Funcionalidades
  isCerebrasAi = signal(false);
  aiLoadingProgress = signal(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deferredPrompt: any;
  showInstallButton = signal(false);
  isOfflineMode = signal(false);
  isLiveMode = signal(false);
  leagueGames = signal<Game[]>([]);
  teamGames = signal<Game[]>([]);
  loadingGames = signal(false);
  gamesError = signal<string | null>(null);

  // Mapeamento de IDs das Ligas (API-Football)
  private leagueIds: Record<string, number> = {
    "Espanha - La Liga": 140,
    "Inglaterra - Premier League": 39,
    "Itália - Serie A": 135,
    "Alemanha - Bundesliga": 78,
    "França - Ligue 1": 61,
    "Brasil - Série A": 71,
    "Brasil - Série B": 72
  };

  private teamIds: Record<string, number> = {
    "PSG": 85,
    "Barcelona": 529,
    "Real Madrid": 541,
    "Bayern": 157,
    "Liverpool": 40,
    "Flamengo": 119
  };

  constructor() {
    // Definir liga inicial e buscar jogos
    effect(() => {
      const names = this.leagueNames();
      if (names.length > 0 && !this.selectedLeague()) {
        this.selectedLeague.set(names[0]);
      }
      
      const league = this.selectedLeague();
      if (league) {
        this.buscarJogosPorLiga(league);
      }
    }, { allowSignalWrites: true });

    if (this.isBrowser) {
      this.requestNotificationPermission();
      this.setupInstallPrompt();
    }
  }

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton.set(true);
    });
  }

  async installApp() {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      this.showInstallButton.set(false);
    }
    this.deferredPrompt = null;
  }

  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.permission;
      if (permission === 'default') {
        await Notification.requestPermission();
      }
    }
  }

  showNotification(title: string, body: string) {
    if (this.isBrowser && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }

  async buscarJogosPorLiga(league: string) {
    const leagueId = this.leagueIds[league];
    if (!leagueId) {
      this.leagueGames.set([]);
      return;
    }

    this.loadingGames.set(true);
    this.gamesError.set(null);

    try {
      const today = new Date();
      const future = new Date();
      future.setDate(today.getDate() + 15);

      const from = today.toISOString().split('T')[0];
      const to = future.toISOString().split('T')[0];
      
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      
      // Lógica de temporada: Ligas brasileiras (71, 72) usam o ano atual.
      // Ligas europeias usam o ano anterior se estivermos no primeiro semestre.
      let season = currentYear;
      if (leagueId !== 71 && leagueId !== 72 && currentMonth < 7) {
        season = currentYear - 1;
      }

      const headers = new HttpHeaders({
        'x-rapidapi-key': this.footballApiKey,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      });

      const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${leagueId}&season=${season}&from=${from}&to=${to}`;
      const res = await firstValueFrom(this.http.get<FootballApiResponse>(url, { headers }));

      if (res.errors && Object.keys(res.errors).length > 0) {
        throw new Error(JSON.stringify(res.errors));
      }

      let games: Game[] = [];
      if (res.response && res.response.length > 0) {
        games = await this.mapFixturesToGames(res.response);
      } else {
        // Fallback: buscar próximos 10 jogos sem filtro de data
        const fallbackUrl = `https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${leagueId}&season=${season}&next=10`;
        const fallbackRes = await firstValueFrom(this.http.get<FootballApiResponse>(fallbackUrl, { headers }));
        if (fallbackRes.response && fallbackRes.response.length > 0) {
          games = await this.mapFixturesToGames(fallbackRes.response);
        }
      }

      this.leagueGames.set(games);
      this.isOfflineMode.set(false);
    } catch (error) {
      console.error('Erro ao buscar jogos:', error);
      // Fallback para jogos mockados se a API falhar
      this.isOfflineMode.set(true);
      const mockGames: Game[] = [
        {
          id: 1, homeTeam: 'Flamengo', awayTeam: 'Palmeiras', homeLogo: 'https://media.api-sports.io/football/teams/127.png', awayLogo: 'https://media.api-sports.io/football/teams/121.png',
          date: '05/04/2026', time: '16:00', dayOfWeek: 'Domingo', venue: 'Maracanã',
          odds: { home: 1.95, draw: 3.40, away: 3.80 }, probs: { home: 48, draw: 28, away: 24 },
          palpite: 'Vitória do Flamengo', confianca: 72, resumo: 'Flamengo muito forte no Maracanã.'
        },
        {
          id: 2, homeTeam: 'Corinthians', awayTeam: 'São Paulo', homeLogo: 'https://media.api-sports.io/football/teams/131.png', awayLogo: 'https://media.api-sports.io/football/teams/126.png',
          date: '05/04/2026', time: '18:30', dayOfWeek: 'Domingo', venue: 'Neo Química Arena',
          odds: { home: 2.20, draw: 3.10, away: 3.40 }, probs: { home: 42, draw: 30, away: 28 },
          palpite: 'Empate ou Corinthians', confianca: 65, resumo: 'Clássico equilibrado na Neo Química Arena.'
        },
        {
          id: 3, homeTeam: 'Atlético-MG', awayTeam: 'Cruzeiro', homeLogo: 'https://media.api-sports.io/football/teams/1062.png', awayLogo: 'https://media.api-sports.io/football/teams/135.png',
          date: '06/04/2026', time: '20:00', dayOfWeek: 'Segunda-feira', venue: 'Arena MRV',
          odds: { home: 1.80, draw: 3.50, away: 4.50 }, probs: { home: 52, draw: 26, away: 22 },
          palpite: 'Vitória do Atlético-MG', confianca: 78, resumo: 'Galo favorito no clássico mineiro.'
        }
      ];
      this.leagueGames.set(mockGames);
      this.showNotification('⚠️ MODO OFFLINE', 'Usando dados simulados devido a erro na API.');
    } finally {
      this.loadingGames.set(false);
    }
  }

  async buscarJogosDoTime(teamId: number) {
    this.loadingGames.set(true);
    this.gamesError.set(null);
    this.teamGames.set([]);

    try {
      const today = new Date();
      const future = new Date();
      future.setDate(today.getDate() + 15);

      const from = today.toISOString().split('T')[0];
      const to = future.toISOString().split('T')[0];

      const headers = new HttpHeaders({
        'x-rapidapi-key': this.footballApiKey,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      });

      const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures?team=${teamId}&from=${from}&to=${to}`;
      const res = await firstValueFrom(this.http.get<FootballApiResponse>(url, { headers }));

      const games = await this.mapFixturesToGames(res.response);
      this.teamGames.set(games);
    } catch (error) {
      console.error('Erro ao buscar jogos do time:', error);
      this.gamesError.set('Erro ao carregar jogos do time.');
    } finally {
      this.loadingGames.set(false);
    }
  }

  private async mapFixturesToGames(fixtures: { fixture: { id: number, date: string, venue: { name: string } }, teams: { home: { name: string, logo: string }, away: { name: string, logo: string } } }[]): Promise<Game[]> {
    const games: Game[] = [];
    for (const f of fixtures) {
      const dateObj = new Date(f.fixture.date);
      
      const homeProb = 30 + Math.random() * 50;
      const drawProb = 10 + Math.random() * 20;
      const awayProb = 100 - (homeProb + drawProb);

      const homeOdds = Number((100 / homeProb).toFixed(2));
      const drawOdds = Number((100 / drawProb).toFixed(2));
      const awayOdds = Number((100 / awayProb).toFixed(2));

      const prediction = this.gerarPalpiteSimples(
        f.teams.home.name, 
        f.teams.away.name
      );

      games.push({
        id: f.fixture.id,
        homeTeam: f.teams.home.name,
        awayTeam: f.teams.away.name,
        homeLogo: f.teams.home.logo,
        awayLogo: f.teams.away.logo,
        date: dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        dayOfWeek: dateObj.toLocaleDateString('pt-BR', { weekday: 'long' }),
        venue: f.fixture.venue.name || 'Estádio Indefinido',
        odds: { home: homeOdds, draw: drawOdds, away: awayOdds },
        probs: { home: Math.round(homeProb), draw: Math.round(drawProb), away: Math.round(awayProb) },
        palpite: prediction.palpite,
        confianca: prediction.confianca,
        resumo: prediction.resumo
      });
    }
    return games;
  }

  private gerarPalpiteSimples(timeCasa: string, timeFora: string) {
    // Para demonstração, gerar palpites baseados no nome/força dos times
    const timesFortes = ['Barcelona', 'Real Madrid', 'Bayern', 'Liverpool', 'PSG', 'Flamengo', 'Palmeiras', 'Santos', 'Cruzeiro', 'Arsenal', 'Manchester City'];
    const isCasaForte = timesFortes.some(t => timeCasa.includes(t));
    const isForaForte = timesFortes.some(t => timeFora.includes(t));
    
    if (isCasaForte && !isForaForte) {
      return {
        palpite: `Vitória do ${timeCasa}`,
        confianca: 72,
        resumo: `${timeCasa} é favorito, time em boa fase e jogando em casa.`
      };
    } else if (isForaForte && !isCasaForte) {
      return {
        palpite: `Vitória do ${timeFora}`,
        confianca: 65,
        resumo: `${timeFora} tem elenco superior e deve controlar o jogo.`
      };
    } else if (isCasaForte && isForaForte) {
      return {
        palpite: `Dupla Chance (${timeCasa} ou Empate)`,
        confianca: 58,
        resumo: `Clássico de grandes times. Mandante tem leve vantagem.`
      };
    } else {
      return {
        palpite: `Mais de 1.5 gols`,
        confianca: 62,
        resumo: `Jogo equilibrado, expectativa de gols.`
      };
    }
  }

  retryFetchGames() {
    const league = this.selectedLeague();
    if (league) this.buscarJogosPorLiga(league);
    
    const team = this.selectedTeam();
    if (team && team.name) {
      const teamId = this.teamIds[team.name];
      if (teamId) this.buscarJogosDoTime(teamId);
    }
  }

  async analyzeGame(game: Game) {
    this.searchTerm.set(game.homeTeam);
    this.loading.set(true);
    this.showResults.set(false);
    this.aiLoadingProgress.set(10);

    try {
      // 1. Buscar dados de ambos os times
      let t1Data = this.teamsData[game.homeTeam];
      let t2Data = this.teamsData[game.awayTeam];

      if (this.footballApiKey) {
        this.aiLoadingProgress.set(20);
        const [liveT1, liveT2] = await Promise.all([
          this.fetchLiveTeamData(game.homeTeam),
          this.fetchLiveTeamData(game.awayTeam)
        ]);
        if (liveT1) t1Data = liveT1;
        if (liveT2) t2Data = liveT2;
      }

      if (!t1Data) t1Data = this.getFallbackData(game.homeTeam);
      if (!t2Data) t2Data = this.getFallbackData(game.awayTeam);

      this.selectedTeam.set({ ...t1Data, name: game.homeTeam, logo: game.homeLogo });
      this.aiLoadingProgress.set(50);

      // 2. Buscar H2H
      let h2hText = "Sem histórico recente disponível.";
      if (this.footballApiKey) {
        h2hText = await this.fetchH2HData(game.homeTeam, game.awayTeam);
      }
      this.aiLoadingProgress.set(70);

      // 3. Chamar IA para analisar o confronto
      this.geminiService.analyzeMatch(game.homeTeam, game.awayTeam, t1Data, t2Data, h2hText).subscribe({
        next: (response) => {
          this.aiLoadingProgress.set(100);
          this.loading.set(false);
          this.showResults.set(true);
          this.aiAnalysis.set(response);
          this.calculateMarkets(game.homeTeam, t1Data!);
          
          setTimeout(() => {
            const el = document.getElementById('analysis-content');
            if (el) window.scrollTo({ top: el.offsetTop - 100, behavior: 'smooth' });
          }, 150);
        },
        error: (err) => {
          console.error('Erro na IA:', err);
          this.loading.set(false);
          this.showResults.set(true);
          this.generateAiAnalysis(game.homeTeam, t1Data!);
        }
      });

    } catch (error) {
      console.error('Erro na análise:', error);
      this.loading.set(false);
    }
  }

  private async fetchH2HData(team1: string, team2: string): Promise<string> {
    try {
      const headers = new HttpHeaders({
        'x-rapidapi-key': this.footballApiKey,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      });

      // Buscar IDs
      const [id1, id2] = await Promise.all([
        firstValueFrom(this.http.get<{ response: { team: { id: number } }[] }>(`https://api-football-v1.p.rapidapi.com/v3/teams?search=${team1}`, { headers })),
        firstValueFrom(this.http.get<{ response: { team: { id: number } }[] }>(`https://api-football-v1.p.rapidapi.com/v3/teams?search=${team2}`, { headers }))
      ]);

      if (!id1.response?.length || !id2.response?.length) return "Histórico não encontrado.";

      const h2hRes = await firstValueFrom(this.http.get<{ response: { teams: { home: { name: string }, away: { name: string } }, goals: { home: number, away: number }, fixture: { date: string } }[] }>(`https://api-football-v1.p.rapidapi.com/v3/fixtures/headtohead?h2h=${id1.response[0].team.id}-${id2.response[0].team.id}&last=5`, { headers }));
      
      return h2hRes.response.map(f => 
        `${f.teams.home.name} ${f.goals.home}-${f.goals.away} ${f.teams.away.name} (${new Date(f.fixture.date).toLocaleDateString()})`
      ).join('\n');
    } catch (error) {
      console.error("Erro ao buscar H2H:", error);
      return "Erro ao buscar histórico.";
    }
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  selectTeam(name: string) {
    this.searchTerm.set(name);
    this.analyze();
  }

  selectSuggestion(name: string) {
    this.searchTerm.set(name);
    this.analyze();
  }

  toggleComparison() {
    // Funcionalidade removida
  }

  async analyze() {
    const name = this.searchTerm();
    this.loading.set(true);
    this.showResults.set(false);
    this.aiLoadingProgress.set(10);

    let data: TeamData | null = null;

    // Tentar API Real se houver chave configurada no backend
    if (this.footballApiKey) {
      data = await this.fetchLiveTeamData(name);
      if (data) this.isLiveMode.set(true);
    }
    this.aiLoadingProgress.set(40);

    // Fallback para Mock
    if (!data) {
      data = this.teamsData[name] || this.getFallbackData(name);
      this.isLiveMode.set(false);
    }
    this.aiLoadingProgress.set(60);

    this.selectedTeam.set({ name, ...data! });
    this.calculateMarkets(name, data!);
    this.saveToHistory();

    // Buscar jogos específicos do time
    const teamId = this.teamIds[name];
    if (teamId) {
      this.buscarJogosDoTime(teamId);
    } else {
      this.teamGames.set([]);
    }

    // Integração Gemini AI
    this.isCerebrasAi.set(false);
    this.geminiService.analyzeTeam(name, data!).subscribe({
      next: (response) => {
        this.aiAnalysis.set(response);
        this.isCerebrasAi.set(true);
        this.aiLoadingProgress.set(100);
        this.finishAnalysis();
      },
      error: (error) => {
        console.error('Erro na IA Gemini:', error);
        this.generateAiAnalysis(name, data!); // Fallback simulado
        this.aiLoadingProgress.set(100);
        this.finishAnalysis();
      }
    });
  }

  private finishAnalysis() {
    setTimeout(() => {
      this.loading.set(false);
      this.showResults.set(true);
      this.aiLoadingProgress.set(0);

      const rec = this.finalRec();
      if (rec && rec.confidence > 80) {
        this.showNotification('🎯 PALPITE FORTE', `${rec.title} com ${rec.confidence}% de confiança`);
      }
    }, 500);
  }

  private getFallbackData(name: string): TeamData {
    return {
      name: name,
      league: "Liga Internacional",
      form: ["V", "E", "D", "V", "V"],
      goalsFor: 1.8,
      goalsAgainst: 1.2,
      corners: 5.5,
      cards: 2.8,
      stats: { v: 3, e: 1, d: 1 },
      homeAdvantage: "Bom desempenho em casa",
      awayDisadvantage: "Desempenho regular fora"
    };
  }

  private async fetchLiveTeamData(name: string): Promise<TeamData | null> {
    try {
      const headers = new HttpHeaders({
        'x-rapidapi-key': this.footballApiKey,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      });

      // 1. Buscar ID do Time
      const searchRes = await firstValueFrom(this.http.get<{ response: { team: { id: number } }[] }>(`https://api-football-v1.p.rapidapi.com/v3/teams?search=${name}`, { headers }));
      if (!searchRes.response?.length) return null;

      const teamId = searchRes.response[0].team.id;
      
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      let season = currentYear;
      // Lógica simplificada: Ligas europeias (não 71) começam no meio do ano anterior se estivermos antes de Julho
      if (currentMonth < 7) {
        season = currentYear - 1;
      }

      // 2. Buscar Estatísticas
      const statsRes = await firstValueFrom(this.http.get<{ response: { team: { name: string, logo: string }, league: { name: string }, form: string, goals: { for: { average: { total: number } }, against: { average: { total: number } } }, fixtures: { wins: { total: number, home: number, away: number }, draws: { total: number }, losses: { total: number, away: number }, played: { home: number, away: number } } } }>(`https://api-football-v1.p.rapidapi.com/v3/teams/statistics?league=71&season=${season}&team=${teamId}`, { headers }));
      const stats = statsRes.response;

      const homeWins = stats.fixtures.wins.home;
      const homeTotal = stats.fixtures.played.home;
      const awayLosses = stats.fixtures.losses.away;
      const awayTotal = stats.fixtures.played.away;

      return {
        id: teamId,
        name: stats.team.name,
        league: stats.league.name,
        form: stats.form?.split('').slice(-5) || ["V", "E", "V", "E", "V"],
        goalsFor: stats.goals.for.average.total || 1.5,
        goalsAgainst: stats.goals.against.average.total || 1.1,
        corners: 5.8,
        cards: 2.5,
        stats: { 
          v: stats.fixtures.wins.total, 
          e: stats.fixtures.draws.total, 
          d: stats.fixtures.losses.total 
        },
        logo: stats.team.logo,
        homeAdvantage: `Venceu ${homeWins} de ${homeTotal} em casa`,
        awayDisadvantage: `Perdeu ${awayLosses} de ${awayTotal} fora`
      };
    } catch (error) {
      console.error("Erro API Football:", error);
      return null;
    }
  }

  private saveToHistory() {
    // Histórico removido a pedido do usuário
  }

  loadFromHistory() {
    // Histórico removido a pedido do usuário
  }

  selectForComparison() {
    // Modo comparação removido
  }

  analyzeComparison() {
    // Modo comparação removido
  }

  async exportToPdf() {
    const element = document.getElementById('analysis-content');
    if (!element) return;

    const canvas = await html2canvas(element, { backgroundColor: '#0D0D0F', scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Relatorio_OddsUp_${this.selectedTeam()?.name || 'Analise'}.pdf`);
  }

  private calculateMarkets(name: string, data: TeamData) {
    const vPerc = Math.min(95, (data.stats.v * 15) + (data.goalsFor * 8) + 10);
    const ePerc = Math.min(30, (data.stats.e * 10) + 10);
    const dPerc = Math.max(5, 100 - (vPerc + ePerc));

    const totalGols = data.goalsFor + data.goalsAgainst;
    const m15 = Math.min(98, 60 + (totalGols * 8));
    const m25 = Math.min(92, 40 + (totalGols * 10));
    const m35 = Math.min(75, 15 + (totalGols * 12));

    const btts = Math.min(85, 35 + (totalGols * 7));
    const esc85 = Math.min(90, 45 + (data.corners * 4));
    const esc95 = Math.min(80, 35 + (data.corners * 3));
    const car35 = Math.min(85, 30 + (data.cards * 8));
    const car45 = Math.min(70, 20 + (data.cards * 6));

    this.markets.set([
      { title: 'Resultado Final', icon: 'track_changes', items: [
        { label: 'Vitória', value: vPerc },
        { label: 'Empate', value: ePerc },
        { label: 'Derrota', value: dPerc }
      ]},
      { title: 'Gols (Over/Mais)', icon: 'sports_soccer', items: [
        { label: 'Mais de 1.5 Gols', value: m15 },
        { label: 'Mais de 2.5 Gols', value: m25 },
        { label: 'Mais de 3.5 Gols', value: m35 }
      ]},
      { title: 'Disciplina', icon: 'style', items: [
        { label: 'Mais de 3.5 Cartões', value: car35 },
        { label: 'Mais de 4.5 Cartões', value: car45 },
        { label: `Time + ${Math.round(data.cards)} cartões`, value: Math.min(95, 50 + (data.cards * 5)) }
      ]},
      { title: 'Escanteios', icon: 'flag', items: [
        { label: 'Mais de 8.5 Cantos', value: esc85 },
        { label: 'Mais de 9.5 Cantos', value: esc95 },
        { label: `Time + ${Math.round(data.corners)} cantos`, value: Math.min(95, 55 + (data.corners * 3)) }
      ]},
      { title: 'Ambas Marcam', icon: 'compare_arrows', items: [
        { label: 'SIM (BTTS)', value: btts },
        { label: 'NÃO (BTTS)', value: 100 - btts }
      ]},
      { title: 'Intervalo (HT)', icon: 'timer', items: [
        { label: 'Gols 0.5+ HT', value: Math.max(40, m15 - 20) },
        { label: 'Gols 1.5+ HT', value: Math.max(15, m25 - 35) }
      ]}
    ]);

    const bestMarket = vPerc > 70 ? `${name} VENCE` : (m25 > 65 ? 'MAIS 2.5 GOLS' : 'AMBAS MARCAM');
    const combo = m15 > 80 ? ' + OVER 1.5' : '';
    
    this.finalRec.set({
      title: `🔥 RECOMENDAÇÃO PREMIUM: ${bestMarket}${combo}`,
      confidence: Math.round((vPerc + m15) / 2),
      risk: vPerc > 80 ? 'Baixo' : (vPerc > 65 ? 'Médio' : 'Alto'),
      stake: `${Math.max(1, Math.floor(vPerc / 10) - 1)}/10`
    });
  }

  private generateAiAnalysis(name: string, data: TeamData) {
    const winCount = data.stats.v;
    const phase = winCount >= 4 ? "em uma fase avassaladora" : "em um momento de consolidação";
    const offensive = data.goalsFor > 2.5 ? "um poder de fogo assustador" : (data.goalsFor > 1.8 ? "um ataque muito eficiente" : "um ataque equilibrado");
    const defensive = data.goalsAgainst < 0.9 ? "uma defesa quase intransponível" : (data.goalsAgainst < 1.3 ? "uma defesa sólida" : "algumas vulnerabilidades defensivas");
    const trend = data.form[0] === 'V' ? "vem de vitória e mantém o moral elevado" : "busca recuperação imediata";
    
    const analysis = `A análise profunda da nossa IA indica que o ${name} está ${phase}. Com ${winCount} vitórias nos últimos 5 compromissos, o time demonstra ${offensive}, ostentando uma média de ${data.goalsFor} gols por partida. No setor defensivo, observamos ${defensive}, o que traz segurança para o mercado de 'Resultado Final'. O time ${trend}, e considerando a média de ${data.corners} escanteios, o mercado de cantos também se mostra extremamente atrativo para este confronto.`;
    
    this.aiAnalysis.set(analysis);
  }
}
