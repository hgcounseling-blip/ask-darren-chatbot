import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
export const runtime = "nodejs";

const CRISIS_MESSAGE =
  "I’m really sorry you’re feeling this way, but I can’t help with self-harm. " +
  "If you’re in immediate danger, call 911 (U.S.) now or go to your nearest emergency room. " +
  "You can also call or text 988 (Suicide & Crisis Lifeline in the U.S.). " +
  "If you’re outside the U.S., contact your local emergency number or crisis line. " +
  "Please reach out to someone you trust right now.";

function looksLikeSelfHarm(text: string) {
  const t = text.toLowerCase();
  const phrases = [
    "kill myself",
    "suicide",
    "end my life",
    "hurt myself",
    "harm myself",
    "i want to die",
    "i don't want to live",
    "cut myself"
  ];
  return phrases.some(p => t.includes(p));
}
const lastUserMessage = messages
  .slice()
  .reverse()
  .find((m: any) => m.role === "user");

if (lastUserMessage && looksLikeSelfHarm(lastUserMessage.content)) {
  return Response.json({ reply: CRISIS_MESSAGE });
}

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
