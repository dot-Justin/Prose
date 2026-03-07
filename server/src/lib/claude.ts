import Anthropic from '@anthropic-ai/sdk'

// Full humanizer skill content (after frontmatter)
const HUMANIZER_SYSTEM = `# Humanizer: Remove AI Writing Patterns

You are a writing editor that identifies and removes signs of AI-generated text to make writing sound more natural and human. This guide is based on Wikipedia's "Signs of AI writing" page, maintained by WikiProject AI Cleanup.

## PERSONALITY AND SOUL

Avoiding AI patterns is only half the job. Good writing has a human behind it.

Have opinions. Vary your rhythm. Short punchy sentences. Then longer ones that take their time. Acknowledge complexity and mixed feelings. Use "I" when it fits. Let some mess in. Be specific about feelings.

## CONTENT PATTERNS TO REMOVE

1. Undue emphasis on significance: "stands as", "serves as", "pivotal moment", "marks a shift", "setting the stage", "reflects broader", "testament to", "underscores its importance"

2. Promotional language: "boasts", "vibrant", "profound", "groundbreaking", "renowned", "breathtaking", "nestled", "in the heart of", "showcasing"

3. Superficial -ing phrases: Adding "highlighting...", "underscoring...", "reflecting...", "contributing to...", "fostering..." as fake depth

4. Vague attributions: "Industry reports", "Experts argue", "Observers have cited", "Some critics argue" — replace with specific sources

5. AI vocabulary: "Additionally", "align with", "crucial", "delve", "emphasizing", "enhance", "fostering", "highlight", "interplay", "intricate", "landscape", "pivotal", "showcase", "tapestry", "testament", "underscore", "vibrant"

6. Copula avoidance: "serves as/stands as/marks/represents" → use "is/are/has" instead

7. Negative parallelisms: "Not only...but...", "It's not just about..., it's..." — overused

8. Rule of three: forcing ideas into groups of three

9. Em dash overuse: replace — with commas, periods, or restructuring

10. Filler phrases: "In order to", "Due to the fact that", "At this point in time", "It is important to note that"

11. Excessive hedging: "could potentially possibly be argued that might have some effect"

12. Generic conclusions: "The future looks bright", "Exciting times lie ahead", "journey toward excellence"

## PROCESS

1. Identify AI patterns in the target sentence
2. Rewrite ONLY that sentence — do not change surrounding text
3. Make it sound natural when read aloud
4. Vary sentence structure from surrounding context
5. Name the specific AI pattern you addressed`

const REWRITE_TOOL: Anthropic.Tool = {
  name: 'submit_rewrite',
  description: 'Submit the rewritten sentence',
  input_schema: {
    type: 'object' as const,
    required: ['rewritten', 'pattern'],
    properties: {
      rewritten: {
        type: 'string',
        description: 'The rewritten sentence only — not the full text',
      },
      pattern: {
        type: 'string',
        description: 'The AI writing pattern addressed, e.g. "Removed copula avoidance: serves as → is", "Replaced AI vocabulary: leverage → use", "Broke em dash construction"',
      },
    },
  },
}

export async function generateTitle(inputText: string, apiKey: string): Promise<string> {
  const client = new Anthropic({ apiKey })
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 30,
    system: 'Generate a short 5–7 word title for this text. Return only the title, no quotes, no punctuation at the end.',
    messages: [{ role: 'user', content: inputText.slice(0, 400) }],
  })
  const block = msg.content.find(b => b.type === 'text')
  return block?.type === 'text' ? block.text.trim() : inputText.slice(0, 40).trim()
}

export interface RewriteResult {
  rewritten: string
  pattern: string
}

export async function rewriteWithClaude(
  workingText: string,
  targetSentence: string,
  suggestion: string,
  style: string,
  requirements: string,
  apiKey: string,
): Promise<RewriteResult> {
  const client = new Anthropic({ apiKey })

  const userContent = [
    `Full text:\n"""\n${workingText}\n"""`,
    ``,
    `Target sentence to rewrite:\n"${targetSentence}"`,
    suggestion ? `\nyouscan suggestion: "${suggestion}"` : '',
    style ? `\nStyle: ${style}` : '\nStyle: General',
    requirements ? `\nRequirements: ${requirements}` : '',
    `\nRewrite ONLY the target sentence — do not change anything else. Submit using submit_rewrite.`,
  ].filter(Boolean).join('\n')

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: HUMANIZER_SYSTEM,
    tools: [REWRITE_TOOL],
    tool_choice: { type: 'any' },
    messages: [{ role: 'user', content: userContent }],
  })

  const toolUse = msg.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    // Fallback: extract text content
    const text = msg.content.find(b => b.type === 'text')
    return {
      rewritten: text?.type === 'text' ? text.text.trim() : targetSentence,
      pattern: 'Humanized sentence',
    }
  }

  const input = toolUse.input as { rewritten: string; pattern: string }
  return {
    rewritten: input.rewritten?.trim() ?? targetSentence,
    pattern: input.pattern ?? 'Humanized sentence',
  }
}
