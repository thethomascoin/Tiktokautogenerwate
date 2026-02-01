import { scrapeProduct } from "./productScraper"
import { generateUGCScript, parseUGCScript } from "./scriptGenerator"
import { renderProductVideo } from "./creatomateVideo"

export async function generateUGCVideoFromUrl(url: string, customScript?: string) {
  const product = await scrapeProduct(url)

  if (!product.images.length) {
    throw new Error("No product images found")
  }

  let script: string = customScript || ""
  if (!script) {
    script = await generateUGCScript(product)
  }

  const parsed = parseUGCScript(script)

  const videoUrl = await renderProductVideo({
    image: product.images[0],
    hook: parsed.hook,
    cta: parsed.cta,
    script: parsed.subtitles
  })

  return {
    videoUrl,
    script,
    product
  }
}
