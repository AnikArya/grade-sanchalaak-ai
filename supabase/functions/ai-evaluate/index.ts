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
      systemPrompt = `Extract EXACTLY 50 technical keywords from the assignment. Focus on domain-specific terms, concepts, tools, methodologies. No generic words. Return ONLY JSON array: ["keyword1", "keyword2", ...]`;
      userPrompt = assignmentProblem;
    } else if (action === 'evaluateAssignment') {
      systemPrompt = `Match keywords in submission. Grade out of 50 (1 point per keyword found). Use semantic matching.
Return JSON: {"matched_keywords":[],"missing_keywords":[],"score":0,"feedback":"brief feedback"}`;
      userPrompt = `Keywords: ${JSON.stringify(referenceKeywords)}\nSubmission: ${assignmentText}`;
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
