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

  if (strongPhrases.some((p) => t.includes(p))) return true;
  if (strongRegex.some((r) => r.test(t))) return true;

  let score = 0;
  if (t.includes("hurt myself")) score += 2;
  if (t.includes("self harm") || t.includes("self-harm")) score += 2;
  if (t.includes("can't go on") || t.includes("no reason to live")) score += 1;

  return score >= 3;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY. Add it to .env.local and restart dev.");
      return Response.json(
        { reply: "Server misconfigured: OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

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

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: process.env.SYSTEM_PROMPT || "You are a helpful assistant.",
        },
        ...safeMessages,
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "I didn’t get that—could you say it a different way?";

    return Response.json({ reply });

  } catch (err: any) {
    const msg =
      err?.message ||
      err?.error?.message ||
      (typeof err === "string" ? err : JSON.stringify(err));
    return Response.json({ reply: "ERROR: " + msg }, { status: 500 });
  }
}

