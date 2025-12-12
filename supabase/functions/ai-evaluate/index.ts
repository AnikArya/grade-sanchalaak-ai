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
      systemPrompt = `Extract 20-30 specific technical keywords from assignment questions. Focus on: technical terms, concepts, tools, methodologies. Avoid generic words. Return ONLY JSON array: ["keyword1", "keyword2", ...]`;
      userPrompt = `Questions:\n${assignmentProblem}`;
    } else if (action === 'evaluateAssignment') {
      systemPrompt = `Evaluate submission against keywords using semantic matching. Return JSON: {"keyword_coverage": 0-100, "matched_keywords": [], "missing_keywords": [], "rubric_scores": {"content_depth": 0-100, "completeness": 0-100}, "overall_score": 0-100, "feedback": "brief feedback", "strengths": [], "areas_for_improvement": []}`;
      userPrompt = `Keywords: ${JSON.stringify(referenceKeywords)}\n\nSubmission:\n${assignmentText}`;
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
