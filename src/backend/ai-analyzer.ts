import axios from 'axios';

export interface AIAnalysisResponse {
  status: 'sucesso' | 'erro';
  analise: string;
  modelo: string | null;
}

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

export class AIAnalyzer {
  private static readonly API_KEY = process.env['CEREBRAS_API_KEY'] || 'csk-e4ytf9hf365v9wh4h8ddwhpk666fhd2fyfv9eykt9cpthfpm';
  private static readonly API_URL = 'https://api.cerebras.ai/v1/chat/completions';

  static async gerarAnaliseIA(jogo: Prediction, mercados: Prediction[]): Promise<AIAnalysisResponse> {
    const contexto = this.prepararContexto(jogo, mercados);
    
    const prompt = `
      Você é um especialista em apostas esportivas. Analise este jogo:
      
      ${contexto}
      
      Responda em português brasileiro:
      1. Qual o melhor palpite para este jogo? Por quê?
      2. Há alguma tendência interessante?
      3. Qual o risco envolvido?
      4. Recomendação final (Aposta forte / Moderada / Pequena)
      
      Seja conciso e objetivo, máximo 200 palavras.
    `;

    try {
      const response = await axios.post(this.API_URL, {
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3.1-8b',
        max_completion_tokens: 1024,
        temperature: 0.2,
        top_p: 1,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const analise = response.data.choices[0].message.content;

      return {
        status: 'sucesso',
        analise,
        modelo: 'llama3.1-8b'
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Erro na IA Cerebras:', error);
      return {
        status: 'erro',
        analise: `Erro na IA: ${errorMessage}`,
        modelo: null
      };
    }
  }

  private static prepararContexto(jogo: Prediction, mercados: Prediction[]): string {
    let texto = `
      JOGO: ${jogo.homeTeam || '?'} x ${jogo.awayTeam || '?'}
      DATA: ${jogo.date || '?'}
      
      MERCADOS DISPONÍVEIS:
    `;

    mercados.forEach(mercado => {
      texto += `\n- ${mercado.market}: ${mercado.prediction}`;
      texto += ` (Confiança: ${mercado.confidence}%)`;
      if (mercado.odds) {
        texto += ` Odds: ${mercado.odds}`;
      }
    });

    return texto;
  }

  static async melhorarJustificativa(mercado: string, palpite: string, dadosEstatisticos: Record<string, unknown>): Promise<string> {
    const prompt = `
      Gere uma justificativa profissional e convincente (máximo 100 caracteres) 
      para este palpite de aposta:
      
      MERCADO: ${mercado}
      PALPITE: ${palpite}
      DADOS: ${JSON.stringify(dadosEstatisticos)}
      
      Seja direto e use linguagem de casa de aposta.
    `;

    try {
      const response = await axios.post(this.API_URL, {
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3.1-8b',
        max_completion_tokens: 150,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content;
    } catch {
      return "Baseado em análise estatística detalhada";
    }
  }
}
