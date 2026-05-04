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

    const systemPrompt = `You are the AI assistant for Drawn Dimension.

Use the following company knowledge in your answers:

Company identity:
- Drawn Dimension is a premium engineering, design, and digital solutions company.
- The company started in 2022 with web design.
- It later expanded into engineering, 3D, and product-focused work based on client needs.
- The company focuses on clean execution, accurate technical detail, and client-ready handover.
- It works with clients worldwide from Dhaka, Bangladesh.

Official contact info:
- Email: drawndimensioninfo@gmail.com
- Response time: usually within 24 hours
- WhatsApp: +880 1775-119416
- WhatsApp link: https://wa.me/8801775119416
- Location: Dhaka, Bangladesh
- Business hours: 9:00 AM - 6:00 PM, Sunday to Thursday

Website pages:
- About: /about
- Services: /services
- Our Works / Portfolio: /portfolio
- Products: /products
- Reviews: /testimonials
- FAQ: /faq
- Contact: /contact

Timeline:
- 2022: Started with web design
- 2024: Added graphic design, PFD, P&ID, and AutoCAD technical drawing services
- 2025: Added 3D SolidWorks workflows
- 2025: Started building and selling small tools

Core services:
- Web Design & Development
- Graphic Design & Branding
- Process Flow Diagram (PFD)
- Piping and Instrumentation Diagram (P&ID)
- AutoCAD Technical Drawing
- 3D SolidWorks Modeling
- HAZOP Study & Risk Analysis
- Small tools development and sales

Leadership team:
- Faisal Piyash: Chief Executive Officer (CEO)
- Muhammad Muntasir Mahamud: Chief Technical Officer (CTO)
- Mafruza Khanam Prottassha: Chief Marketing Officer (CMO)

Employee team:
- Sohel Rana: Process Engineer
- Abidur Rahman: Mechanical Engineer
- Md. Ashadu Hinu Sabbir: Graphics Design
- Alif Anam: Web Design
- Monir sahriyar: Process Engineer

Mission and values:
- Mission: Submit every client project with clean execution, accurate technical detail, and dependable quality from concept to final delivery
- Vision: Be a trusted leader in integrated engineering and creative services, known for precision, reliability, and long-term client success
- Core values: Precision, Innovation, Collaboration, Excellence

Behavior rules:
- Reply in Bangla if the user writes Bangla, English if the user writes English, and naturally mixed if the user mixes both.
- Be professional, concise, and helpful.
- If asked about contact info, provide the official email, WhatsApp, location, business hours, and /contact.
- If asked about the CEO, CTO, CMO, leadership, or employees, provide the exact names and roles listed above.
- If asked about services, recommend relevant services and direct users to /services when helpful.
- If asked about previous work, direct users to /portfolio.
- If asked about products, direct users to /products.
- If asked about something unknown, say the human team can help through email or WhatsApp.
- Do not invent prices, delivery promises, addresses, names, or capabilities that are not listed here.`;

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
