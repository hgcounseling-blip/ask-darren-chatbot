import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
export const runtime = "nodejs";

const CRISIS_MESSAGE =
  "I’m really sorry you’re feeling this way. I can’t help with self-harm, but your safety matters deeply. " +
  "If you are in immediate danger or feel like you might act on these thoughts, please dial 911 right now or go to your nearest emergency room. " +
  "If you are in the United States, you can also call or text 988 to reach the Suicide & Crisis Lifeline 24/7. " +
  "If you are outside the U.S., contact your local emergency number or local crisis hotline immediately. " +
  "Please consider reaching out to someone you trust and do not stay alone right now.";

function toText(x: any): string {
  if (typeof x === "string") return x;
  if (x && typeof x === "object" && typeof x.text === "string") return x.text;
  return "";
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const userTexts = messages
  .filter((m: any) => m?.role === "user")
  .slice(-4)
  .map((m: any) => toText(m?.content))
  .filter(Boolean);

const userTexts = messages
  .filter((m: any) => m?.role === "user")
  .slice(-4)
  .map((m: any) => toText(m?.content))
  .filter(Boolean);

if (userTexts.some((txt: string) => looksLikeSelfHarm(txt))) {
  return Response.json({ reply: CRISIS_MESSAGE });
}

  // Common “benign” contexts we don’t want to over-trigger on
  // (still triggers if other strong indicators exist)
  const benign = [
    "song",
    "lyrics",
    "movie",
    "tv show",
    "book",
    "quote",
    "joke",
    "dark humor",
    "metaphor",
    "i could just die (laughing)",
    "i'm dead (lol)",
  ];

  // Strong, direct intent or planning
  const strongPhrases = [
    "i want to kill myself",
    "i'm going to kill myself",
    "i will kill myself",
    "i plan to kill myself",
    "i'm planning to kill myself",
    "i'm going to end my life",
    "i want to end my life",
    "i plan to end my life",
    "i'm going to take my life",
    "i want to take my life",
    "i'm going to commit suicide",
    "i want to commit suicide",
    "i'm suicidal",
    "i want to die",
    "i don't want to live",
    "i cant go on",
    "i can't go on",
    "i have a plan",
    "i have a way to do it",
  ];

  // Broader indicators + slang/variants
  const mediumPhrases = [
    "suicide",
    "self harm",
    "self-harm",
    "hurt myself",
    "harm myself",
    "kill myself",
    "end it all",
    "end my life",
    "take my life",
    "not worth living",
    "better off without me",
    "everyone would be better without me",
    "unalive myself",
    "unalive",
    "kms", // commonly "kill myself" shorthand
    "cut myself",
    "cutting",
    "overdose",
  ];

  // Regex to catch spacing/punctuation tricks (k i l l  m y s e l f, etc.)
  const strongRegex = [
    /\b(k\s*i\s*l\s*l)\s+(m\s*y\s*s\s*e\s*l\s*f)\b/,
    /\b(end)\s+(my)\s+(life)\b/,
    /\b(take)\s+(my)\s+(life)\b/,
    /\b(commit)\s+(suicide)\b/,
    /\b(self)\s*[- ]?\s*(harm)\b/,
    /\b(harm)\s+(myself)\b/,
    /\b(hurt)\s+(myself)\b/,
    /\b(unalive)\s+(myself)\b/,
  ];

  // Quick direct triggers
  if (strongPhrases.some((p) => t.includes(p))) return true;
  if (strongRegex.some((r) => r.test(t))) return true;

  // Risk scoring for fuzzier cases
  let score = 0;

  // Add points for medium phrases
  for (const p of mediumPhrases) {
    if (t.includes(p)) score += 2;
  }

  // Add points for hopelessness / burdensomeness
  const hopeless = [
    "no reason to live",
    "nothing matters",
    "hopeless",
    "can't do this anymore",
    "cant do this anymore",
    "tired of living",
    "i'm a burden",
    "im a burden",
  ];
  for (const p of hopeless) {
    if (t.includes(p)) score += 1;
  }

  // Reduce score if it looks clearly benign (but don’t reduce below 0)
  if (benign.some((p) => t.includes(p))) score = Math.max(0, score - 2);

  // Threshold
  return score >= 3;
}


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
