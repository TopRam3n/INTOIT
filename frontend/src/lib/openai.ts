const API = 'https://api.openai.com/v1/chat/completions';

async function call(apiKey: string, prompt: string, maxTokens = 250): Promise<string | null> {
  if (!apiKey) return null;
  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
    });
    return (await r.json()).choices?.[0]?.message?.content ?? null;
  } catch { return null; }
}

// ── Show My Mistake ────────────────────────────────────
export async function explainMistake(args: {
  question: string; userAnswer: string; correctAnswer: string;
  explanation: string; topicTitle: string; pKnow: number;
  isStruggling: boolean; apiKey: string;
}): Promise<string | null> {
  const level = args.pKnow < 0.3 ? 'beginner' : args.pKnow < 0.6 ? 'intermediate' : 'advanced';
  return call(args.apiKey,
    `A ${level} student learning "${args.topicTitle}" answered "${args.userAnswer}" but correct is "${args.correctAnswer}".
Standard: "${args.explanation}"${args.isStruggling ? ' They have struggled before. Be extra gentle.' : ''}
Write 3–4 warm sentences: empathise with their reasoning, pinpoint the error, give a memorable trick, end with encouragement. Use "you".`,
    250
  );
}

// ── Hint ───────────────────────────────────────────────
export async function generateHint(args: {
  question: string; topicTitle: string; pKnow: number; apiKey: string;
}): Promise<string | null> {
  return call(args.apiKey,
    `1–2 sentence hint (no spoilers) for: "${args.question}" (Topic: ${args.topicTitle}). Don't give the answer.`,
    80
  );
}

// ── ELI5 rewrite ──────────────────────────────────────
export async function rewriteELI5(args: {
  topicTitle: string; content: string; apiKey: string;
}): Promise<string | null> {
  return call(args.apiKey,
    `Rewrite this math lesson on "${args.topicTitle}" for a complete beginner (ELI5 style). 
Use simple analogies, emojis, short sentences. Max 150 words. Keep the key formula.
Original: ${args.content.slice(0, 500)}`,
    400
  );
}

// ── Challenge rewrite ──────────────────────────────────
export async function rewriteChallenge(args: {
  topicTitle: string; content: string; apiKey: string;
}): Promise<string | null> {
  return call(args.apiKey,
    `Extend this math lesson on "${args.topicTitle}" with advanced insights for a confident student.
Add: edge cases, real-world applications, connections to other topics, a harder worked example. Max 200 words.
Original: ${args.content.slice(0, 500)}`,
    500
  );
}

// ── Voice answer grading ───────────────────────────────
export async function gradeVoiceAnswer(args: {
  question: string; correctAnswer: string; voiceTranscript: string;
  topicTitle: string; apiKey: string;
}): Promise<{ correct: boolean; feedback: string } | null> {
  const result = await call(args.apiKey,
    `Math question: "${args.question}"
Correct answer: "${args.correctAnswer}"
Student said: "${args.voiceTranscript}"

Is the student's answer correct? They may say it differently (e.g. "three x squared" = "3x²").
Respond in JSON only: {"correct": true/false, "feedback": "1 sentence warm feedback"}`,
    120
  );
  if (!result) return null;
  try {
    const clean = result.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch { return null; }
}
