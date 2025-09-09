interface OpenAIMessage {
  role: 'system' | 'user';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class OpenAIService {
  private static API_KEY_STORAGE_KEY = 'openai_api_key';
  
  static saveApiKey(apiKey: string): void {
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
    console.log('OpenAI API key saved successfully');
  }

  static getApiKey(): string | null {
    return localStorage.getItem(this.API_KEY_STORAGE_KEY);
  }

  static removeApiKey(): void {
    localStorage.removeItem(this.API_KEY_STORAGE_KEY);
  }

  static async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Error testing API key:', error);
      return false;
    }
  }

  static async evaluateAssignment(assignmentText: string): Promise<any> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }

    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: `You are an AI-powered assignment evaluator named "Grade Sanchalaak". 
Your job is to analyze student assignments end-to-end and return a structured evaluation. 
Follow these steps carefully:

1. **Keyword Extraction**: From the given assignment text, extract 10–15 domain-specific, contextually relevant keywords (avoid generic terms).  
2. **Semantic Relevance**: Check if the assignment meaningfully covers these keywords, even if exact words are missing. Use semantic similarity, not just keyword matching. Give a relevance score (0–10).  
3. **Rubric-Based Grading**: Evaluate the assignment on these criteria (each 0–5):  
   - Content Relevance  
   - Completeness  
   - Clarity & Language  
   - Originality  
4. **Feedback**: Provide constructive feedback in 2–3 sentences, highlighting strengths and suggesting improvements.  

Return ONLY a valid JSON response in this exact format:
{
  "keywords": ["keyword1", "keyword2", ...],
  "relevance_score": X,
  "rubric": {
    "content_relevance": A,
    "completeness": B,
    "clarity_language": C,
    "originality": D
  },
  "total_score": T,
  "feedback": "..."
}

Where X is 0-10, A,B,C,D are 0-5, and T is the sum of A+B+C+D.`
      },
      {
        role: 'user',
        content: `Please evaluate this assignment:\n\n${assignmentText}`
      }
    ];

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.3,
          max_tokens: 1500,
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to evaluate assignment');
      }

      const data: OpenAIResponse = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response content received');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('Error evaluating assignment:', error);
      throw error;
    }
  }
}