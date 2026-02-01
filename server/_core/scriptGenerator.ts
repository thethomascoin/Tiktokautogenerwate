import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function generateUGCScript(product: {
    title?: string
    description?: string
}) {
    const prompt = `
Create a short TikTok UGC style ad script.

Product: ${product.title}
Description: ${product.description}

Include:
- Hook (1 sentence)
- 3 benefit bullets
- Call to action

Keep under 60 seconds.
`

    // Using a model that is likely to be available and cheap, the prompt suggested gpt-4o-mini
    const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }]
    })

    return res.choices[0].message.content || ""
}

export function parseUGCScript(script: string) {
    const lines = script.split("\n").filter(Boolean)

    return {
        hook: lines[0] ?? "You need this",
        cta: lines[lines.length - 1] ?? "Shop now",
        subtitles: script
    }
}
