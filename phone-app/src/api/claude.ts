/**
 * Sends a transcript to Claude and gets back a 2-byte LED command + explanation.
 * Claude responds with a command code on line 1, then a natural language answer.
 */

import { LEDCommand, isValidCommand } from '../ble/commands';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-6';

const SYSTEM_PROMPT = `You are the response engine for a wearable LED device.
When given a user's statement or question, respond in exactly this format:

Line 1: One of the LED codes below (just the 2-character code, nothing else)
Line 2+: A short, conversational answer (1 sentence, 2 max). Keep it punchy — this displays on a phone screen.

LED codes:
GS — green solid    : yes, confident affirmation
GP — green pulse    : yes, gentle / warm agreement
GC — green chase    : yes, enthusiastic or excited
RS — red solid      : no, firm refusal or negative answer
RF — red flicker    : warning, urgent concern, or danger
YP — yellow pulse   : uncertain, maybe, or nuanced answer
BS — blue solid     : neutral information, acknowledgment, or factual statement
PS — purple solid   : creative, imaginative, or inspired ("cool idea!", "that's inventive")
PP — purple pulse   : deep, philosophical, or profound ("that's a big question")

The user's message may include [Sensor data: ...] with readings from the wearable
device's sensors (temperature, light level, accelerometer). Use this data to give
more grounded responses.

Examples:
GS
Yes! 2 + 2 is definitely 4.

PS
That's a really inventive idea — mixing music with robotics could be amazing.

PP
That's one of the oldest questions in philosophy. Nobody has a definitive answer.`;

export interface ClaudeResponse {
  command: LEDCommand;
  explanation: string;
}

export async function getCommandFromClaude(
  transcript: string,
  apiKey: string
): Promise<ClaudeResponse> {
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 100,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcript }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const raw = (data.content?.[0]?.text ?? '').trim();

  // Split into first line (command) and rest (explanation)
  const lines = raw.split('\n');
  const firstLine = (lines[0] ?? '').trim().toUpperCase();
  const explanation = lines.slice(1).join('\n').trim();

  let command: LEDCommand = 'BS';

  if (isValidCommand(firstLine)) {
    command = firstLine;
  } else {
    // Try to find a valid command anywhere in first line
    const match = firstLine.match(/\b(GS|GP|GC|RS|RF|YP|BS|PS|PP)\b/);
    if (match && isValidCommand(match[1])) {
      command = match[1];
    } else {
      console.warn(`Unexpected Claude response: "${firstLine}", falling back to BS`);
    }
  }

  return {
    command,
    explanation: explanation || raw,
  };
}
