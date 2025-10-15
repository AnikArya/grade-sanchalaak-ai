interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
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

  static async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        method: 'GET',
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
      throw new Error('Gemini API key not found');
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
      console.log('Making Gemini request with:', {
        model: 'gemini-1.5-flash',
        promptLength: prompt.length,
        assignmentLength: assignmentProblem.length
      });

      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
        }
      };

      console.log('Request body:', requestBody);

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

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

      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      let data: GeminiResponse;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error('Invalid JSON response from Gemini');
      }
      
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
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1500,
        }
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini API Error:', errorData);
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