import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
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

    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
    const systemPrompt =
      process.env.SYSTEM_PROMPT || "You are a helpful assistant.";

    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...safeMessages],
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
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
