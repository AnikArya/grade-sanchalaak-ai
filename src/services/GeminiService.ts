interface GeminiContent {
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export class GeminiService {
  private static API_KEY_STORAGE_KEY = 'gemini_api_key';
  
  static saveApiKey(apiKey: string): void {
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
    console.log('Gemini API key saved successfully');
  }

  static getApiKey(): string | null {
    return localStorage.getItem(this.API_KEY_STORAGE_KEY);
  }

  static removeApiKey(): void {
    localStorage.removeItem(this.API_KEY_STORAGE_KEY);
  }

  static async testApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: 'Test' }]
              }
            ]
          }),
        }
      );
      
      if (response.ok) {
        return { valid: true };
      }
      
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || 'Unknown error';
      
      if (response.status === 429) {
        return { valid: true, error: 'quota_exceeded' };
      }
      
      if (response.status === 400 || response.status === 403) {
        return { valid: false, error: 'invalid_key' };
      }
      
      return { valid: false, error: errorMessage };
    } catch (error) {
      console.error('Error testing API key:', error);
      return { valid: false, error: 'network_error' };
    }
  }

  static async extractKeywords(assignmentProblem: string): Promise<string[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }

    const prompt = `You are a keyword extraction specialist for academic assignment evaluation. Extract 30-40 highly relevant, domain-specific keywords from the assignment problem that will be used to assess student submissions.

FOCUS ON:
- Core technical terms and concepts central to the topic
- Subject-specific terminology and vocabulary
- Key processes, principles, theories, or laws
- Important methodologies, frameworks, or models
- Critical skills, techniques, or competencies required
- Domain-specific jargon essential for the topic
- Specific examples, case studies, or scenarios mentioned

AVOID:
- Generic academic words: "important", "good", "bad", "analysis", "conclusion", "introduction", "explanation"
- Common verbs: "discuss", "explain", "describe", "analyze", "evaluate"
- Vague terms without specific meaning
- Overly broad concepts

PRIORITIZE quality over quantity - each keyword should be meaningful and directly relevant.

Return ONLY a valid JSON array of 30-40 keywords (no more, no less):
["keyword1", "keyword2", ..., "keyword40"]

Extract keywords from this assignment problem:

${assignmentProblem}`;

    try {
      console.log('Making Gemini request with:', {
        model: 'gemini-2.0-flash',
        promptLength: prompt.length,
        assignmentLength: assignmentProblem.length
      });

      const requestBody = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
        }
      };

      console.log('Request body:', requestBody);

      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(requestBody),
        }
      );

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API Error Response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText } };
        }
        
        throw new Error(errorData.error?.message || 'Failed to extract keywords');
      }

      const data: GeminiResponse = await response.json();
      console.log('Parsed Gemini Response:', data);
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No candidates in Gemini response');
      }
      
      const content = data.candidates[0]?.content?.parts?.[0]?.text;
      
      if (!content) {
        console.error('Empty content in response:', data);
        throw new Error('No response content received from Gemini');
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
        throw new Error('Failed to parse Gemini response');
      }
    } catch (error) {
      console.error('Error extracting keywords:', error);
      throw error;
    }
  }

  static async evaluateAssignment(assignmentText: string, referenceKeywords: string[]): Promise<any> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Gemini API key not found');
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
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1500,
        }
      };

      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API Error:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText } };
        }
        
        throw new Error(errorData.error?.message || 'Failed to evaluate assignment');
      }

      const data: GeminiResponse = await response.json();
      console.log('Gemini Evaluation Response:', data);
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No candidates in Gemini response');
      }
      
      const content = data.candidates[0]?.content?.parts?.[0]?.text;
      
      if (!content) {
        console.error('Empty content in response:', data);
        throw new Error('No response content received from Gemini');
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
        throw new Error('Failed to parse Gemini response');
      }
    } catch (error) {
      console.error('Error evaluating assignment:', error);
      throw error;
    }
  }
}