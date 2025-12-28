import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('AI service is not configured');
    }

    const { action, assignmentProblem, assignmentText, referenceKeywords } = await req.json();
    console.log(`Processing: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'extractKeywords') {
      systemPrompt = `You are an expert educator. Extract EXACTLY 50 highly relevant and specific keywords from the assignment questions provided. 
Focus on:
- Technical terms and concepts
- Domain-specific vocabulary
- Tools, methodologies, and frameworks
- Key theories and principles
- Important processes and procedures

Avoid generic words like "the", "and", "important", "good", etc.
Return ONLY a JSON array with exactly 50 keywords: ["keyword1", "keyword2", ...]`;
      userPrompt = `Assignment Questions:\n${assignmentProblem}`;
    } else if (action === 'evaluateAssignment') {
      systemPrompt = `You are an expert assignment evaluator. Evaluate the student submission against the reference keywords using semantic matching (not just exact matches - understand context and meaning).

Provide detailed, constructive, and actionable feedback that:
1. Acknowledges what the student did well
2. Identifies specific areas where the submission could be improved
3. Gives concrete suggestions for improvement
4. Is encouraging yet honest

Return JSON with this exact structure:
{
  "keyword_coverage": (0-100 percentage of concepts covered),
  "matched_keywords": ["list of keywords/concepts found in submission"],
  "missing_keywords": ["list of important keywords/concepts not addressed"],
  "rubric_scores": {
    "content_depth": (0-100 - how thoroughly concepts are explained),
    "completeness": (0-100 - how many required topics are covered)
  },
  "overall_score": (0-100 weighted average),
  "feedback": "A detailed 3-5 sentence feedback paragraph that is specific to this submission, mentioning what was done well and what needs improvement",
  "strengths": ["3-5 specific things the student did well"],
  "areas_for_improvement": ["3-5 specific actionable suggestions for improvement"]
}`;
      userPrompt = `Reference Keywords to evaluate against:\n${JSON.stringify(referenceKeywords)}\n\nStudent Submission:\n${assignmentText}`;
    } else {
      throw new Error('Invalid action');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit. Try again shortly.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) throw new Error('No AI response');

    let jsonString = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonString = jsonMatch[1].trim();
    
    jsonString = jsonString.trim();
    if (jsonString.startsWith('[') || jsonString.startsWith('{')) {
      return new Response(JSON.stringify({ result: JSON.parse(jsonString) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    throw new Error('Invalid AI response format');
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
