import { supabase } from "@/integrations/supabase/client";

export class GeminiService {
  // Legacy methods kept for backwards compatibility
  private static API_KEY_STORAGE_KEY = 'gemini_api_key';
  
  static saveApiKey(apiKey: string): void {
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
  }

  static getApiKey(): string | null {
    return localStorage.getItem(this.API_KEY_STORAGE_KEY);
  }

  static removeApiKey(): void {
    localStorage.removeItem(this.API_KEY_STORAGE_KEY);
  }

  // New methods using Lovable AI Gateway (no API key needed)
  static async extractKeywords(assignmentProblem: string): Promise<string[]> {
    try {
      console.log('Extracting keywords via Lovable AI Gateway...');
      
      const { data, error } = await supabase.functions.invoke('ai-evaluate', {
        body: {
          action: 'extractKeywords',
          assignmentProblem,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to extract keywords');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const result = data?.result;
      if (!Array.isArray(result)) {
        throw new Error('Invalid response format');
      }

      console.log(`Extracted ${result.length} keywords successfully`);
      return result;
    } catch (error) {
      console.error('Error extracting keywords:', error);
      throw error;
    }
  }

  static async evaluateAssignment(assignmentText: string, referenceKeywords: string[]): Promise<any> {
    try {
      console.log('Evaluating assignment via Lovable AI Gateway...');
      
      const { data, error } = await supabase.functions.invoke('ai-evaluate', {
        body: {
          action: 'evaluateAssignment',
          assignmentText,
          referenceKeywords,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to evaluate assignment');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const result = data?.result;
      if (!result) {
        throw new Error('No evaluation result received');
      }

      // Map the response to match expected format
      return {
        keyword_coverage: result.keyword_coverage || 0,
        matched_keywords: result.matched_keywords || [],
        missing_keywords: result.missing_keywords || [],
        rubric: result.rubric_scores ? {
          content_quality: Math.round((result.rubric_scores.content_quality / 100) * 10),
          completeness: Math.round((result.rubric_scores.structure_organization / 100) * 10),
          clarity_language: 5,
          originality: Math.round((result.rubric_scores.critical_thinking / 100) * 5),
        } : {
          content_quality: 0,
          completeness: 0,
          clarity_language: 0,
          originality: 0,
        },
        total_score: Math.round((result.overall_score / 100) * 50),
        feedback: result.feedback || '',
        strengths: result.strengths || [],
        areas_for_improvement: result.areas_for_improvement || [],
      };
    } catch (error) {
      console.error('Error evaluating assignment:', error);
      throw error;
    }
  }

  // Legacy test method - not needed anymore but kept for compatibility
  static async testApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    // Always return valid since we're using Lovable AI Gateway now
    return { valid: true };
  }
}
