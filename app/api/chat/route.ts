import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing OPENAI_API_KEY in .env.local" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    const systemPrompt =
      process.env.SYSTEM_PROMPT ??
      "You are Darren McKinnis’s relationship and marriage coaching chatbot.";

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.7,
    });

    return new Response(
      JSON.stringify({ message: completion.choices[0].message }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
