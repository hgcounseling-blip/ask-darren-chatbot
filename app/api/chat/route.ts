import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { reply: "Server misconfigured: OPENAI_API_KEY is missing in Vercel." },
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
  .slice(-16)
  .map((m: any) => ({ role: m.role, content: m.content }));

// --- Crisis Safety Check ---
const lastUserMessage =
  safeMessages[safeMessages.length - 1]?.content?.toLowerCase() || "";

const crisisKeywords = [
  "suicide",
  "kill myself",
  "end my life",
  "self harm",
  "hurt myself",
  "don't want to live",
  "want to die",
];

const isCrisis = crisisKeywords.some((word) =>
  lastUserMessage.includes(word)
);

if (isCrisis) {
  return Response.json({
    reply:
      "I’m really glad you said something. If you are in immediate danger, please call 911 right now or go to your nearest emergency room. You can also call or text 988 in the United States to reach the Suicide & Crisis Lifeline. You don’t have to carry this alone — real people are available 24/7.",
  });
}

// --- Faith Mode Detection ---
const faithKeywords = [
  "bible",
  "scripture",
  "god",
  "jesus",
  "christ",
  "pray",
  "prayer",
  "faith",
  "christian",
  "church",
  "biblical",
];

const isFaithRequest = faithKeywords.some((word) =>
  lastUserMessage.includes(word)
);

let systemPrompt: string;

if (isFaithRequest) {
  systemPrompt = `
You are Darren McKinnis’s relationship and marriage advice chatbot.

Speak with warmth, clarity, and pastoral calm.
When appropriate, integrate biblical wisdom naturally.
Encourage humility, forgiveness, responsibility, reconciliation, and hope.
Use Scripture thoughtfully when it fits, not excessively.
Avoid shame. Be invitational, not preachy.
`;
} else {
  systemPrompt = `
You are Darren McKinnis’s relationship and marriage advice chatbot.

Use Gottman-informed relationship principles.
Help identify communication patterns, emotional flooding, repair attempts, and attachment needs.
Be warm, practical, structured, and non-shaming.
Give one small actionable step and a word-for-word script when helpful.
`;
}

const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
