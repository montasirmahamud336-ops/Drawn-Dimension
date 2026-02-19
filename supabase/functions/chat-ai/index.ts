import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Messages array is required");
    }

    const systemPrompt = `You are a helpful assistant for DrawnDimension, a professional design and engineering services company.

Services we offer:
- Web Design & Development
- AutoCAD Technical Drawings
- 3D SolidWorks Modeling
- PFD & P&ID Engineering Diagrams
- HAZOP Safety Studies
- Graphic Design & Branding

You should:
1. Help users understand our services
2. Answer questions about pricing (general ranges, suggest contacting for custom quotes)
3. Guide users through the quote request process
4. Provide helpful information about engineering and design concepts
5. Be professional, friendly, and concise

If users want a specific quote, encourage them to:
- Visit the Contact page
- Describe their project requirements
- Our team will create a custom quote for them

Keep responses concise but helpful.`;

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const model = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";
    const contents = messages.slice(-10).map((message: { role: string; content: string }) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents,
          generationConfig: {
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          error: `AI API error ${response.status}: ${errorText.slice(0, 500)}`,
          content: "I'm sorry, I couldn't reach the AI model. Please try again.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const content =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I apologize, but I couldn't generate a response. Please try again.";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        content: "I'm sorry, I encountered an error. Please try again." 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
