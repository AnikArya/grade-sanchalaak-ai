interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class GeminiService {
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
        method: 'GET',
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

    const prompt = `You are a keyword extraction specialist. Your job is to extract 50 highly relevant, domain-specific keywords from assignment problems that will be used to evaluate student solutions.

Extract keywords that are:
- Technical terms, concepts, methodologies
- Subject-specific terminology
- Key processes, principles, or theories
- Important tools, frameworks, or models
- Critical skills or competencies
- Domain-specific jargon and terminology

Avoid generic terms like: "important", "good", "analysis", "conclusion", "introduction"

Return ONLY a valid JSON array of exactly 50 keywords:
["keyword1", "keyword2", ..., "keyword50"]

Extract 50 relevant keywords from this assignment problem:

${assignmentProblem}`;

    try {
      console.log('Making OpenAI request with:', {
        model: 'gpt-5-nano-2025-08-07',
        promptLength: prompt.length,
        assignmentLength: assignmentProblem.length
      });

      const requestBody = {
        model: 'gpt-5-nano-2025-08-07',
        messages: [
          { role: 'system', content: 'You are a keyword extraction specialist. Return only valid JSON arrays.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_completion_tokens: 1000,
      };

      console.log('Request body:', requestBody);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API Error Response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText } };
        }
        
        // Handle specific error cases
        if (response.status === 429 || errorData.error?.code === 'insufficient_quota') {
          throw new Error('You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.');
        }
        
        throw new Error(errorData.error?.message || 'Failed to extract keywords');
      }

      const data = await response.json();
      console.log('Parsed OpenAI Response:', data);
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No choices in OpenAI response');
      }
      
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        console.error('Empty content in response:', data);
        throw new Error('No response content received from OpenAI');
      }

      try {
        // Extract JSON from the response which might contain markdown formatting
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          return Array.isArray(result) ? result : [];
        } else {
          // Try parsing the entire content as JSON
          const result = JSON.parse(content);
          return Array.isArray(result) ? result : result.keywords || [];
        }
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError, 'Content:', content);
        throw new Error('Failed to parse OpenAI response');
      }
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

    const prompt = `You are an AI-powered assignment evaluator named "Grade Sanchalaak". 
Evaluate student assignments based on provided reference keywords and content quality.

Reference Keywords: ${referenceKeywords.join(', ')}

Evaluation Criteria (Total: 50 marks):
1. **Keyword Coverage**: How many reference keywords are meaningfully addressed (0-20)
2. **Content Quality**: Depth, understanding, and proper explanation (0-10)
3. **Completeness**: How thoroughly the assignment addresses the topic (0-10)  
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
}

Evaluate this assignment:

${assignmentText}`;

    try {
      const requestBody = {
        model: 'gpt-5-nano-2025-08-07',
        messages: [
          { role: 'system', content: 'You are an AI-powered assignment evaluator. Return only valid JSON responses.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_completion_tokens: 1500,
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API Error:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText } };
        }
        
        // Handle specific error cases
        if (response.status === 429 || errorData.error?.code === 'insufficient_quota') {
          throw new Error('You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.');
        }
        
        throw new Error(errorData.error?.message || 'Failed to evaluate assignment');
      }

      const data = await response.json();
      console.log('OpenAI Evaluation Response:', data);
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No choices in OpenAI response');
      }
      
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        console.error('Empty content in response:', data);
        throw new Error('No response content received from OpenAI');
      }

      try {
        // Extract JSON from the response which might contain markdown formatting
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        } else {
          // Try parsing the entire content as JSON
          return JSON.parse(content);
        }
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError, 'Content:', content);
        throw new Error('Failed to parse OpenAI response');
      }
    } catch (error) {
      console.error('Error evaluating assignment:', error);
      throw error;
    }
  }
}