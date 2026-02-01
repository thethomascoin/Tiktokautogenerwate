import axios from "axios"
import * as cheerio from "cheerio"

export async function scrapeProduct(url: string) {
  const { data } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  })

  const $ = cheerio.load(data)

  // Generic fallbacks (works for many shops)
  const title =
    $('meta[property="og:title"]').attr("content") ||
    $("title").text()

  const description =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    ""

  const images = new Set<string>()

  $('meta[property="og:image"]').each((_, el) => {
    const src = $(el).attr("content")
    if (src) images.add(src)
  })

  $("img").each((_, el) => {
    const src = $(el).attr("src")
    if (src && src.startsWith("http")) images.add(src)
  })

  return {
    title: title?.slice(0, 200),
    description: description?.slice(0, 500),
    images: Array.from(images).slice(0, 6) // limit for sanity
  }
}
