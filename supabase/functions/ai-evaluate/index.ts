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
      systemPrompt = `You are an expert academic assignment evaluator. Your PRIMARY task is to find keywords in student submissions using FLEXIBLE MATCHING.

KEYWORD MATCHING RULES (VERY IMPORTANT):
- Match keywords using SEMANTIC similarity, not just exact text match
- A keyword is "matched" if the student discusses the CONCEPT, even with different wording
- Consider synonyms, related terms, abbreviations, and variations as matches
- Example: "ML" matches "machine learning", "AI" matches "artificial intelligence"
- Example: "database" matches "DB", "databases", "data storage", "data management"
- Example: "algorithm" matches "algorithmic approach", "algo", "computational method"
- Be GENEROUS with matching - if the concept is clearly discussed, count it as matched
- Look for the keyword's meaning/concept in the text, not just the exact word

EVALUATION CRITERIA:
1. Keyword Coverage (40%): How many reference keyword CONCEPTS are covered (use flexible matching)
2. Content Quality (30%): Depth, accuracy, clarity of explanations
3. Structure & Organization (15%): Logical flow and presentation
4. Critical Thinking (15%): Analysis, synthesis, original insights

SCORING:
- 90-100%: Excellent - comprehensive coverage, deep understanding
- 70-89%: Good - solid coverage with minor gaps
- 50-69%: Satisfactory - adequate coverage, basic understanding
- 30-49%: Needs Improvement - limited coverage
- 0-29%: Poor - minimal coverage

CRITICAL: Be generous with keyword matching. Students may use different terminology to express the same concepts. If the core idea of a keyword is present, mark it as matched.

Return ONLY a valid JSON object:
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
  "feedback": "<constructive feedback>",
  "strengths": ["strength1", ...],
  "areas_for_improvement": ["area1", ...]
}`;

      userPrompt = `REFERENCE KEYWORDS TO FIND (use flexible/semantic matching):
${JSON.stringify(referenceKeywords)}

STUDENT SUBMISSION TEXT:
"""
${assignmentText}
"""

TASK: Carefully read the submission and identify which keyword CONCEPTS are discussed, even if different words are used. Be generous - if a concept is clearly covered, mark that keyword as matched.`;
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
