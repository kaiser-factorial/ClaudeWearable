/**
 * Sends a transcript to Claude and gets back a 2-byte LED command.
 * Claude is instructed to respond with exactly one command from the protocol.
 */

import { LEDCommand, isValidCommand } from '../ble/commands';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-6';

const SYSTEM_PROMPT = `You are the response engine for a wearable LED device.
When given a user's statement or question, choose the single best LED response
from the list below and reply with ONLY the 2-character code — nothing else.

GS — green solid    : yes, confident affirmation
GP — green pulse    : yes, gentle / warm agreement
GC — green chase    : yes, enthusiastic or excited
RS — red solid      : no, firm refusal or negative answer
RF — red flicker    : warning, urgent concern, or danger
YP — yellow pulse   : uncertain, maybe, or nuanced answer
BS — blue solid     : neutral information, acknowledgment, or factual statement

Examples:
"Is it going to rain today?" with context of high chance of rain → RF
"Should I eat breakfast?" → GP
"Is 2+2=4?" → GS
"What's the capital of France?" → BS
"Am I doing a good job?" → GC
"Should I jump off a cliff?" → RS
"Is this a good idea?" with no clear answer → YP`;

export async function getCommandFromClaude(
  transcript: string,
  apiKey: string
): Promise<LEDCommand> {
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcript }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const raw = (data.content?.[0]?.text ?? '').trim().toUpperCase();

  if (isValidCommand(raw)) return raw;

  // If Claude added extra text, try to extract the first valid 2-char code
  const match = raw.match(/\b(GS|GP|GC|RS|RF|YP|BS)\b/);
  if (match && isValidCommand(match[1])) return match[1];

  // Fallback
  console.warn(`Unexpected Claude response: "${raw}", falling back to BS`);
  return 'BS';
}
