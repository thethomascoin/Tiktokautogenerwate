import axios from "axios";
import * as fs from "fs";
import * as path from "path";

const HF_API_BASE = "https://api-inference.huggingface.co";
const HF_TOKEN = process.env.HUGGING_FACE_API_TOKEN;

interface VideoGenerationOptions {
  script: string;
  productName: string;
  videoStyle?: "demo" | "unboxing" | "review" | "testimonial";
  duration?: number; // seconds
}

interface GeneratedVideo {
  videoUrl: string;
  videoPath: string;
  duration: number;
  style: string;
}

/**
 * Generate a UGC video using Hugging Face Inference API
 * Uses LTX-Video model for fast, high-quality video generation
 */
export async function generateUGCVideo(
  options: VideoGenerationOptions
): Promise<GeneratedVideo> {
  const {
    script,
    productName,
    videoStyle = "demo",
    duration = 15,
  } = options;

  try {
    // Create a detailed prompt for the video generation
    const prompt = createVideoPrompt(script, productName, videoStyle, duration);

    console.log(`Generating ${videoStyle} video for "${productName}"...`);
    console.log(`Prompt: ${prompt.substring(0, 100)}...`);

    // Call Hugging Face Inference API with LTX-Video model
    const response = await axios.post(
      `${HF_API_BASE}/models/Lightricks/LTX-Video-0.9.8-13B-distilled`,
      {
        inputs: prompt,
        parameters: {
          max_new_tokens: 1024,
          num_inference_steps: 50,
          guidance_scale: 7.5,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 300000, // 5 minute timeout for video generation
        responseType: "arraybuffer",
      }
    );

    // Save the generated video to disk
    const videoDir = path.join(process.cwd(), "public", "videos");
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }

    const videoFileName = `ugc_${videoStyle}_${Date.now()}.mp4`;
    const videoPath = path.join(videoDir, videoFileName);
    const videoUrl = `/videos/${videoFileName}`;

    fs.writeFileSync(videoPath, response.data);

    console.log(`✅ Video generated successfully: ${videoUrl}`);

    return {
      videoUrl,
      videoPath,
      duration,
      style: videoStyle,
    };
  } catch (error: any) {
    console.error("Error generating video:", error.message);

    // If HF API fails, try alternative approach or throw
    if (error.response?.status === 429) {
      throw new Error(
        "Rate limited by Hugging Face. Please try again in a few moments."
      );
    }

    if (error.response?.status === 401) {
      throw new Error("Invalid Hugging Face API token");
    }

    throw new Error(`Video generation failed: ${error.message}`);
  }
}

/**
 * Generate multiple video variations for the same product
 * Creates 2-3 different styles that can be stitched together
 */
export async function generateMultipleVideoVariations(
  options: VideoGenerationOptions
): Promise<GeneratedVideo[]> {
  const styles: Array<"demo" | "unboxing" | "review"> = [
    "demo",
    "unboxing",
    "review",
  ];
  const videos: GeneratedVideo[] = [];

  for (const style of styles) {
    try {
      const video = await generateUGCVideo({
        ...options,
        videoStyle: style,
        duration: 10, // Shorter duration for stitching
      });
      videos.push(video);

      // Add delay between API calls to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`Failed to generate ${style} video:`, error.message);
      // Continue with other styles even if one fails
    }
  }

  if (videos.length === 0) {
    throw new Error("Failed to generate any video variations");
  }

  return videos;
}

/**
 * Create a detailed prompt for video generation based on script and style
 */
function createVideoPrompt(
  script: string,
  productName: string,
  style: string,
  duration: number
): string {
  const styleDescriptions: Record<string, string> = {
    demo: "Product demonstration video showing features and benefits in action",
    unboxing:
      "Unboxing video with close-ups of packaging and product reveal, trending TikTok style",
    review:
      "Honest product review with user testimonial, casual and authentic vibe",
    testimonial: "Customer testimonial video with genuine reactions and feedback",
  };

  const styleDesc = styleDescriptions[style] || styleDescriptions.demo;

  return `Create a ${duration}-second UGC (User Generated Content) TikTok video for the product "${productName}".

Style: ${styleDesc}

Script/Narration: ${script}

Requirements:
- Professional but casual TikTok aesthetic
- Fast-paced cuts and transitions
- Include product shots and lifestyle footage
- Add text overlays with key selling points
- Use trending TikTok music/sound effects
- Vertical 9:16 aspect ratio
- High production quality
- Engaging and viral-worthy content

Generate a complete, ready-to-post TikTok video.`;
}

export default {
  generateUGCVideo,
  generateMultipleVideoVariations,
};
