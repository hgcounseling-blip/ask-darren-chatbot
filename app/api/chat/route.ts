import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    // =============================
    // 🔐 API Key Check
    // =============================
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { reply: "Server misconfigured: OPENAI_API_KEY is missing in Vercel." },
        { status: 500 }
      );
    }

    // =============================
    // 📩 Parse Request
    // =============================
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
      .map((m: any) => ({
        role: m.role,
        content: m.content,
      }));

    const lastUserMessage =
      safeMessages[safeMessages.length - 1]?.content?.toLowerCase() || "";

    // =============================
    // 🚨 Crisis Override
    // =============================
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

    // =============================
    // ✝️ Faith Mode Detection
    // =============================
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

    // =============================
    // 🧠 Dynamic System Prompt
    // =============================
    let systemPrompt: string;

    if (isFaithRequest) {
      systemPrompt = `
You are Darren McKinnis’s relationship and marriage advice chatbot.

Speak with warmth and pastoral clarity.
Validate briefly, then move toward reconciliation and repair.
Encourage humility and ownership before focusing on the other person.
Emphasize forgiveness, repentance, and restoration.

Offer ONE small repair action that starts with ownership (naming your tone, part, or regret) before requesting a conversation.
If helpful, include a 1–2 sentence script that includes: (1) ownership, (2) care, (3) a simple ask.

Be invitational but not passive.
End with one forward-focused question.
`;
    } else {
      systemPrompt = `
You are Darren McKinnis’s relationship and marriage advice chatbot.

Use Gottman-informed relationship principles.
Validate briefly, then move toward repair.
Name escalation patterns when present (criticism, defensiveness, flooding, shutdown).
Encourage ownership before blame.

Offer ONE small repair action that starts with ownership (naming your tone, part, or regret) before requesting a conversation.
If helpful, include a 1–2 sentence script that includes: (1) ownership, (2) care, (3) a simple ask.

Be warm, calm, direct, and non-shaming.
End with one forward-focused question.
`;
    }

    // =============================
    // 🤖 OpenAI Call
    // =============================
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...safeMessages],
      temperature: 0.7,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I didn’t get that—could you say it a different way?";

    return Response.json({ reply });
  } catch (err: any) {
    const msg = err?.message || String(err);
    return Response.json({ reply: "ERROR: " + msg }, { status: 500 });
  }
}

