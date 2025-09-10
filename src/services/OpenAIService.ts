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

  static async extractKeywords(assignmentProblem: string): Promise<string[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }

    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: `You are a keyword extraction specialist. Your job is to extract 50 highly relevant, domain-specific keywords from assignment problems that will be used to evaluate student solutions.

Extract keywords that are:
- Technical terms, concepts, methodologies
- Subject-specific terminology
- Key processes, principles, or theories
- Important tools, frameworks, or models
- Critical skills or competencies
- Domain-specific jargon and terminology

Avoid generic terms like: "important", "good", "analysis", "conclusion", "introduction"

Return ONLY a valid JSON array of exactly 50 keywords:
["keyword1", "keyword2", ..., "keyword50"]`
      },
      {
        role: 'user',
        content: `Extract 50 relevant keywords from this assignment problem:\n\n${assignmentProblem}`
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
          model: 'gpt-5-2025-08-07',
          messages: messages,
          temperature: 0.2,
          max_completion_tokens: 1000,
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to extract keywords');
      }

      const data: OpenAIResponse = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response content received');
      }

      const result = JSON.parse(content);
      return Array.isArray(result) ? result : result.keywords || [];
    } catch (error) {
      console.error('Error extracting keywords:', error);
      throw error;
    }
  }

  static async evaluateAssignment(assignmentText: string, referenceKeywords: string[]): Promise<any> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }

    // Check if assignment only contains keywords (warning detection)
    const wordCount = assignmentText.split(/\s+/).length;
    const keywordMatches = referenceKeywords.filter(keyword => 
      assignmentText.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    
    const isKeywordOnly = wordCount < 100 && (keywordMatches / wordCount) > 0.3;

    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: `You are an AI-powered assignment evaluator named "Grade Sanchalaak". 
Evaluate student assignments based on provided reference keywords and content quality.

Reference Keywords: ${referenceKeywords.join(', ')}

Evaluation Criteria:
1. **Keyword Coverage**: How many reference keywords are meaningfully addressed (0-10)
2. **Content Quality**: Depth, understanding, and proper explanation (0-5)
3. **Completeness**: How thoroughly the assignment addresses the topic (0-5)  
4. **Clarity & Language**: Writing quality and communication (0-5)
5. **Originality**: Original thinking and insights beyond keywords (0-5)

${isKeywordOnly ? 'WARNING: This assignment appears to only contain keywords without proper explanation.' : ''}

Return ONLY a valid JSON response:
{
  "keyword_coverage": X,
  "matched_keywords": ["matched1", "matched2", ...],
  "missing_keywords": ["missing1", "missing2", ...],
  "rubric": {
    "content_quality": A,
    "completeness": B,
    "clarity_language": C,
    "originality": D
  },
  "total_score": T,
  "is_keyword_only": ${isKeywordOnly},
  "feedback": "...",
  "warning": "${isKeywordOnly ? 'Assignment appears to contain only keywords without proper explanations.' : ''}"
}`
      },
      {
        role: 'user',
        content: `Evaluate this assignment:\n\n${assignmentText}`
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
          model: 'gpt-5-2025-08-07',
          messages: messages,
          temperature: 0.3,
          max_completion_tokens: 1500,
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