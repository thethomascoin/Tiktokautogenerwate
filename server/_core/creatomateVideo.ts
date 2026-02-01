import { Client } from "creatomate"

// Ensure CREATOMATE_API_KEY is available in environment variables
const client = new Client(process.env.CREATOMATE_API_KEY!)

export async function renderProductVideo(params: {
    image: string
    hook: string
    cta: string
    script: string
}) {
    // Use provided template ID or a placeholder if not yet configured by USER
    const templateId = process.env.CREATOMATE_TEMPLATE_ID || "YOUR_TEMPLATE_ID_HERE"

    const renders = await client.render({
        templateId,
        modifications: {
            product_image: params.image,
            hook_text: params.hook,
            cta_text: params.cta
        },
        // @ts-ignore: subtitles is a valid option but missing in types
        subtitles: {
            source: "script",
            text: params.script
        },
        outputFormat: "mp4"
    })

    // renders is an array, we take the first one
    return renders[0].url
}
