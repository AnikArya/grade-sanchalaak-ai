import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('AI service is not configured');
    }

    const { action, assignmentProblem, assignmentText, referenceKeywords } = await req.json();
    console.log(`Processing AI request: action=${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'extractKeywords') {
      systemPrompt = `You are a keyword extraction specialist for academic assignment evaluation. Extract 30-40 highly relevant, domain-specific keywords from the assignment problem that will be used to assess student submissions.

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
["keyword1", "keyword2", ..., "keyword40"]`;

      userPrompt = `Extract keywords from this assignment problem:\n\n${assignmentProblem}`;
    } else if (action === 'evaluateAssignment') {
      systemPrompt = `You are an expert academic assignment evaluator. Evaluate student assignments based on keyword coverage and content quality.

EVALUATION CRITERIA:
1. Keyword Coverage (40% weight): Check how many reference keywords appear in the submission
2. Content Quality (30% weight): Assess depth, accuracy, and clarity of explanations
3. Structure & Organization (15% weight): Evaluate logical flow and presentation
4. Critical Thinking (15% weight): Look for analysis, synthesis, and original insights

SCORING GUIDELINES:
- Excellent (90-100%): Comprehensive coverage, deep understanding, well-structured
- Good (70-89%): Good coverage, solid understanding, minor gaps
- Satisfactory (50-69%): Adequate coverage, basic understanding, some issues
- Needs Improvement (30-49%): Limited coverage, superficial understanding
- Poor (0-29%): Minimal coverage, fundamental misunderstandings

IMPORTANT: Be fair but rigorous. Provide constructive feedback.

Return your evaluation as a valid JSON object with this exact structure:
{
  "keyword_coverage": <number 0-100>,
  "matched_keywords": ["keyword1", "keyword2", ...],
  "missing_keywords": ["keyword1", "keyword2", ...],
  "rubric_scores": {
    "content_quality": <number 0-100>,
    "structure_organization": <number 0-100>,
    "critical_thinking": <number 0-100>
  },
  "overall_score": <number 0-100>,
  "feedback": "<constructive feedback string>",
  "strengths": ["strength1", "strength2", ...],
  "areas_for_improvement": ["area1", "area2", ...]
}`;

      userPrompt = `Reference Keywords: ${JSON.stringify(referenceKeywords)}

Student Submission:
${assignmentText}

Evaluate this submission against the reference keywords and provide your assessment.`;
    } else {
      throw new Error('Invalid action. Use "extractKeywords" or "evaluateAssignment"');
    }

    console.log('Calling Lovable AI Gateway...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response received, parsing...');
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonString = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1].trim();
    }
    
    // Clean up the string
    jsonString = jsonString.trim();
    if (jsonString.startsWith('[') || jsonString.startsWith('{')) {
      const result = JSON.parse(jsonString);
      console.log('Successfully parsed AI response');
      return new Response(JSON.stringify({ result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    throw new Error('Could not parse AI response as JSON');
  } catch (error) {
    console.error('Error in ai-evaluate function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
