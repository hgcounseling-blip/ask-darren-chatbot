import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function looksLikeSelfHarm(text: string) {
  const t = (text || "").toLowerCase();
  return (
    t.includes("kill myself") ||
    t.includes("suicide") ||
    t.includes("end my life") ||
    t.includes("take my life") ||
    t.includes("hurt myself") ||
    t.includes("self harm") ||
    t.includes("self-harm") ||
    t.includes("i want to die") ||
    t.includes("dont want to live") ||
    t.includes("don't want to live")
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const messages = Array.isArray(body?.messages)
      ? body.messages
      : body?.message
        ? [{ role: "user", content: String(body.message) }]
        : [];

    const lastUser = [...messages].reverse().find((m: any) => m?.role === "user");
    const userText = String(lastUser?.content || "");

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { reply: "Server is missing OPENAI_API_KEY." },
        { status: 500 }
      );
    }

    if (looksLikeSelfHarm(userText)) {
      return Response.json({
        reply:
          "If you are in immediate danger, call 911 now. If you’re thinking about self-harm, call or text 988 (U.S.). If you’re outside the U.S., contact your local emergency number or crisis line.",
      });
    }

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: userText,
    });

    const reply =
      (response as any)?.output_text?.trim() ||
      "I didn’t get that—could you say it a different way?";

    return Response.json({ reply });
  } catch (err) {
    return Response.json({ reply: "Server error. Try again." }, { status: 500 });
  }
}

