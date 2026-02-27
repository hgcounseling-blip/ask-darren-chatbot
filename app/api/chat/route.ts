import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

const CRISIS_MESSAGE =
  "I’m really sorry you’re feeling this. If you’re in immediate danger, call 911 now. " +
  "If you’re in the U.S., you can call or text 988 (Suicide & Crisis Lifeline). " +
  "If you’re outside the U.S., contact your local emergency number or crisis line. " +
  "If you can, reach out to someone you trust right now.";

const SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT ??
  `You are Darren McKinnis’s relationship and marriage coaching chatbot.

VOICE & TONE:
Warm, grounded, calm, direct, relational, and plainspoken—like a steady coach who wants people on the same team. Speak like a caring coach, not a therapist. No clinical tone. No academic explanations. Use short, steady sentences. Slow the pacing.

OUTPUT FORMAT:
Exactly five labeled lines:
REFLECT:
PATTERN:
NEXT STEP:
SCRIPT:
QUESTION:`;

// Detect “flooded mode” language
function isFloodedTrigger(text: string) {
  return /(angry|anger|yell|yelling|rage|furious|heated|heart is racing|racing heart|pulse|pounding|pounding heart|flooded|overwhelmed|can't calm|cant calm|too worked up|so mad)/i.test(
    text || ""
  );
}function heartMathFiveLines() {
  return [
    "REFLECT: Yeah. If your heart’s pounding, your body’s in fight mode. Let’s slow it down first.",
    "PATTERN: Sounds like you’re getting flooded, and once that happens it’s hard to stay calm and connected.",
    "NEXT STEP: Hand on your chest. Breathe in for 5 seconds and out for 5 seconds for 6–10 breaths. While you breathe, bring to mind one specific moment you appreciate about them. If you’re still hot after that, take 20 minutes before you keep talking.",
    'SCRIPT: “I’m too heated to do this well. I’m going to take 20 minutes, then we can try again—I’m on your team.”',
    "QUESTION: What’s your first sign you’re flooded—fast heart, tight chest, raised voice, or going quiet?",
  ].join("\n");
}

/**
 * Ensures exactly one clean 5-line block.
 * Clips duplicates and rebuilds output to the required labels.
 */
function normalizeFiveLines(text: string) {
  const raw = (text || "").trim();

  const secondReflect = raw.indexOf("REFLECT:", 1);
  const clipped = secondReflect > 0 ? raw.slice(0, secondReflect).trim() : raw;

  const extract = (label: string) => {
    const re = new RegExp(
      `${label}:\\s*([\\s\\S]*?)(?=\\n(?:REFLECT|PATTERN|NEXT STEP|SCRIPT|QUESTION):|$)`,
      "i"
    );
    const m = clipped.match(re);
    return (m?.[1] ?? "").trim().replace(/\s+/g, " ");
  };

  const reflect = extract("REFLECT");
  const pattern = extract("PATTERN");
  const nextStep = extract("NEXT STEP");
  const script = extract("SCRIPT");
  const question = extract("QUESTION");

  if (reflect && pattern && nextStep && script && question) {
    return [
      `REFLECT: ${reflect}`,
      `PATTERN: ${pattern}`,
      `NEXT STEP: ${nextStep}`,
      `SCRIPT: ${script}`,
      `QUESTION: ${question}`,
    ].join("\n");
  }

  return [
    "REFLECT: Yeah. Let’s slow this down for a second.",
    "PATTERN: Sounds like you’re getting pulled into a loop (defensiveness).",
    "NEXT STEP: Take a 10-minute pause, then restart with one soft sentence about what you feel and what you need.",
    'SCRIPT: “Hey, I’m not against you. Can we reset and try again?”',
    "QUESTION: What’s the main trigger—money, time, chores, or feeling unheard?",
  ].join("\n");
}

/**
 * Deterministic HeartMath “Flooded Mode” response (always the same method).
 * This is what fixes the 4/6 breathing problem permanently.
 */
function heartMathFiveLines() {
  return [
    "REFLECT: Yeah. If your heart’s pounding, your body’s in fight mode. Let’s slow it down first.",
    "PATTERN: Sounds like you’re getting flooded, and once that happens it’s hard to stay calm and connected.",
    "NEXT STEP: Hand on your chest. Breathe in for 5 seconds and out for 5 seconds for 6–10 breaths. While you breathe, bring to mind one specific moment you appreciate about them. If you’re still hot after that, take 20 minutes before you keep talking.",
    'SCRIPT: “I’m too heated to do this well. I’m going to take 20 minutes, then we can try again—I’m on your team.”',
    "QUESTION: What’s your first sign you’re flooded—fast heart, tight chest, raised voice, or going quiet?",
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const messages: Array<{ role: string; content: string }> = Array.isArray(
      (body as any)?.messages
    )
      ? (body as any).messages
      : (body as any)?.message
        ? [{ role: "user", content: String((body as any).message) }]
        : [];

    const lastUser = [...messages].reverse().find((m) => m?.role === "user");
    const userText = String(lastUser?.content || "");

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { reply: "Server is missing OPENAI_API_KEY." },
        { status: 500 }
      );
    }

    if (looksLikeSelfHarm(userText)) {
      return Response.json({ reply: CRISIS_MESSAGE });
    }

    // ✅ HARD GUARANTEE: Flooded Mode always teaches HeartMath (no model improvising breathing)
    if (isFloodedTrigger(userText)) {
      return Response.json({ reply: heartMathFiveLines() });
    }

    const safeMessages = messages
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
      )
      .slice(-16);

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: SYSTEM_PROMPT,
      input: safeMessages,
    });

    const rawReply =
      (response as any)?.output_text?.trim() ||
      "REFLECT: Yeah. I didn’t catch that. Let’s slow down.\nPATTERN: Sounds like the signal got crossed (defensiveness).\nNEXT STEP: Re-send your question in one sentence.\nSCRIPT: “Here’s what I’m trying to say…”\nQUESTION: What’s the main thing you want help with right now?";

    return Response.json({ reply: normalizeFiveLines(rawReply) });
  } catch (err) {
    return Response.json(
      {
        reply: normalizeFiveLines(
          "REFLECT: Yeah. Something glitched on my end.\nPATTERN: Sounds like the system hit an error.\nNEXT STEP: Try your message again in one sentence.\nSCRIPT: “Here’s the situation in one line…”\nQUESTION: What’s the main thing you want help with right now?"
        ),
      },
      { status: 200 }
    );
  }
}