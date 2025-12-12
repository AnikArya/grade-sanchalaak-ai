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
      systemPrompt = `You are an expert academic examiner extracting ESSENTIAL ANSWER KEYWORDS from assignment questions. Your task is to identify the specific terms, concepts, and technical vocabulary that MUST appear in a correct, comprehensive answer.

EXTRACTION STRATEGY:
1. READ each question carefully and identify WHAT specific knowledge it tests
2. EXTRACT technical terms, definitions, concepts, methodologies that students MUST mention
3. INCLUDE proper nouns, specific tools, frameworks, theories, principles
4. INCLUDE multi-word technical phrases as single keywords (e.g., "user persona", "visual hierarchy", "design thinking")
5. PRIORITIZE domain-specific terminology over generic academic words

KEYWORD CATEGORIES TO EXTRACT:
- Technical Definitions: Terms students must define (e.g., "wireframe", "prototype", "usability testing")
- Named Concepts: Specific methodologies, frameworks, theories (e.g., "design thinking five stages", "information architecture")
- Differentiating Terms: Key distinctions students must make (e.g., "low-fidelity vs high-fidelity", "UI vs UX")
- Tools & Technologies: Specific tools mentioned or expected (e.g., "Figma", "Adobe XD", "Sketch")
- Process Steps: Stages, phases, or steps in methodologies
- Quality Indicators: Specific criteria, metrics, or principles

STRICTLY AVOID:
- Generic words: "important", "example", "explain", "difference", "purpose", "benefit", "aspect"
- Question words: "what", "why", "how", "define", "list", "mention"
- Filler words: "concept", "idea", "thing", "aspect", "element"
- Overly broad terms without specific technical meaning

Return ONLY a valid JSON array of 25-35 highly specific keywords:
["technical_keyword1", "specific_concept2", "domain_term3", ...]`;

      userPrompt = `ASSIGNMENT QUESTIONS:
"""
${assignmentProblem}
"""

TASK: Extract 25-35 SPECIFIC technical keywords and concepts that a student MUST include in their answers to score well. Focus on domain-specific terminology, not generic academic words.`;
    } else if (action === 'evaluateAssignment') {
      systemPrompt = `You are an expert academic evaluator. Evaluate the student's submission against the reference keywords using SEMANTIC and CONCEPTUAL matching.

KEYWORD MATCHING APPROACH:
1. SEMANTIC MATCH: The exact keyword or its synonym appears (e.g., "UI" = "User Interface" = "interface design")
2. CONCEPTUAL MATCH: The concept is explained even with different wording
3. CONTEXTUAL MATCH: The keyword's meaning is demonstrated through examples or application
4. ABBREVIATION MATCH: Common abbreviations count (e.g., "UX" = "User Experience", "IA" = "Information Architecture")

MATCHING EXAMPLES:
- "user persona" matches: "persona", "user profile", "fictional user", "target user representation"
- "wireframe" matches: "wire-frame", "skeleton layout", "basic layout sketch", "low-fi mockup"
- "usability testing" matches: "user testing", "usability test", "testing with users", "UX testing"
- "visual hierarchy" matches: "hierarchy of elements", "visual priority", "design hierarchy"

SCORING RUBRIC:
1. Keyword Coverage (50%): Percentage of reference concepts adequately covered
   - Count a keyword as matched if the CONCEPT is clearly present
   - Be generous - students may use different but valid terminology
   
2. Content Depth (25%): Quality and accuracy of explanations
   - Are concepts explained correctly?
   - Are examples relevant and appropriate?
   
3. Completeness (25%): Are all parts of questions answered?
   - Did student address what was asked?
   - Are explanations sufficient?

FEEDBACK GUIDELINES:
- Be SPECIFIC: Reference actual content from the submission
- Be CONSTRUCTIVE: Suggest what was missing or could be improved
- Be FAIR: Acknowledge good points before mentioning gaps
- AVOID generic phrases like "good job" or "needs improvement" without specifics

GRADING SCALE (overall_score):
- 85-100: Excellent - Comprehensive coverage with depth
- 70-84: Good - Solid coverage with minor gaps  
- 55-69: Satisfactory - Adequate but missing key concepts
- 40-54: Below Average - Significant gaps in coverage
- 0-39: Poor - Major concepts missing or incorrect

Return ONLY valid JSON:
{
  "keyword_coverage": <0-100>,
  "matched_keywords": ["keywords actually found in submission..."],
  "missing_keywords": ["keywords NOT found in submission..."],
  "rubric_scores": {
    "content_depth": <0-100>,
    "completeness": <0-100>
  },
  "overall_score": <0-100>,
  "feedback": "<2-3 sentences of specific, constructive feedback referencing actual content>",
  "strengths": ["specific strength from the submission..."],
  "areas_for_improvement": ["specific area that needs work..."]
}`;

      userPrompt = `REFERENCE KEYWORDS (find these concepts in the submission):
${JSON.stringify(referenceKeywords)}

STUDENT'S SUBMISSION:
"""
${assignmentText}
"""

Evaluate how well the submission covers the reference keyword concepts. Be generous with semantic/conceptual matching but accurate in your assessment.`;
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
