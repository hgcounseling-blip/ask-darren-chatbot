import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CRISIS_MESSAGE =
  "I’m really sorry you’re feeling this way. If you’re in immediate danger or might harm yourself, call 988 (US Suicide & Crisis Lifeline) or your local emergency number right now. If you’re outside the US, tell me your country and I’ll help find the right number. If you can, reach out to someone you trust and don’t stay alone.";

function looksLikeSelfHarm(text: string): boolean {
  const t = text.toLowerCase();

  const strongPhrases = [
    "kill myself",
    "end my life",
    "suicide",
    "i want to die",
    "i'm going to die",
    "i will kill myself",
  ];

  const strongRegex = [
    /\bkill\s+myself\b/i,
    /\bend\s+my\s+life\b/i,
    /\bcommit\s+suicide\b/i,
  ];

  // Quick direct triggers
  if (strongPhrases.some((p) => t.includes(p))) return true;
  if (strongRegex.some((r) => r.test(t))) return true;

  // Risk scoring for fuzzier cases
  let score = 0;
  if (t.includes("hurt myself")) score += 2;
  if (t.includes("self harm") || t.includes("self-harm")) score += 2;
  if (t.includes("can't go on") || t.includes("no reason to live")) score += 1;

  return score >= 3;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    const safeMessages = messages
      .filter(
        (m: any) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
      )
      .slice(-16);

    const userTexts = safeMessages
      .filter((m: any) => m.role === "user")
      .map((m: any) => m.content as string);

    if (userTexts.some((txt: string) => looksLikeSelfHarm(txt))) {
      return Response.json({ reply: CRISIS_MESSAGE });
    }

    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    const response = await client.responses.create({
      model,
      instructions: process.env.SYSTEM_PROMPT || "You are a helpful assistant.",
      input: safeMessages,
    });

    const reply =
      (response as any).output_text ||
      "I didn’t get that—could you say it a different way?";

    return Response.json({ reply });
  } catch (err: any) {
    return Response.json(
      { reply: "Sorry—something went wrong on the server." },
      { status: 500 }
    );
  }
}
