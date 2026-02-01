import * as db from "../db";
import { invokeLLM } from "./llm";
import { generateImage } from "./imageGeneration";
import { generateVideoWithHuggingFace, generateVideoPlaceholder } from "./videoGeneration";
import axios from "axios";

interface ProcessingContext {
  userId: number;
  queueItemId: number;
  videoId: number;
  productUrl: string;
}

/**
 * Main queue processor - runs periodically to process queued videos
 */
export async function processQueueBatch() {
  try {
    console.log("[Queue Processor] Starting batch processing...");

    // Get next queued item
    const queueItem = await db.getNextQueueItem();
    if (!queueItem) {
      console.log("[Queue Processor] No items in queue");
      return;
    }

    // Mark as processing
    await db.updateQueueItem(queueItem.id, { status: "processing" });

    const context: ProcessingContext = {
      userId: queueItem.userId,
      queueItemId: queueItem.id,
      videoId: queueItem.videoId,
      productUrl: queueItem.productUrl,
    };

    try {
      // Process the video
      await processQueueItem(context);

      // Mark as completed
      await db.updateQueueItem(queueItem.id, { status: "completed" });
      console.log(`[Queue Processor] Completed video ${queueItem.videoId}`);
    } catch (error: any) {
      // Mark as failed
      await db.updateQueueItem(queueItem.id, {
        status: "failed",
        errorMessage: error.message,
      });
      console.error(`[Queue Processor] Failed to process video ${queueItem.videoId}:`, error);
    }
  } catch (error) {
    console.error("[Queue Processor] Batch processing error:", error);
  }
}

/**
 * Process a single queue item
 */
async function processQueueItem(context: ProcessingContext) {
  const { videoId, productUrl } = context;

  // Get video details
  const video = await db.getVideoById(videoId);
  if (!video) {
    throw new Error(`Video ${videoId} not found`);
  }

  // Get user settings
  const settings = await db.getUserSettings(context.userId);

  // Step 1: Generate script
  console.log(`[Queue] Generating script for video ${videoId}`);
  const scriptResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are a UGC (User Generated Content) video script writer. Create short, engaging scripts for TikTok product reviews. Keep scripts punchy, authentic, and under 60 seconds. Include hook, product benefits, and CTA.",
      },
      {
        role: "user",
        content: `Write a UGC script for a TikTok product review video about: ${video.productName}\n\nDescription: ${video.productDescription}\n\nPrice: ${video.productPrice}`,
      },
    ],
  });

  const scriptContent = scriptResponse.choices[0].message.content;
  const script = typeof scriptContent === "string" ? scriptContent : (scriptContent[0] as any).text;

  // Step 2: Generate video
  console.log(`[Queue] Generating video for video ${videoId}`);
  const videoLength = settings?.videoLength || 8;
  const videoQuality = settings?.videoQuality || "balanced";

  const videoPrompt = `UGC-style product video for TikTok: ${script}. Show ${video.productName}. Make it look authentic and engaging.`;

  let videoResult;
  if (settings?.hfToken) {
    try {
      videoResult = await generateVideoWithHuggingFace({
        prompt: videoPrompt,
        duration: videoLength,
        quality: videoQuality as "fast" | "balanced" | "high",
        hfToken: settings.hfToken,
      });
    } catch (hfError) {
      console.warn("[Queue] Hugging Face generation failed, using placeholder");
      videoResult = await generateVideoPlaceholder({
        prompt: videoPrompt,
        duration: videoLength,
        quality: videoQuality as "fast" | "balanced" | "high",
        hfToken: "",
      });
    }
  } else {
    videoResult = await generateVideoPlaceholder({
      prompt: videoPrompt,
      duration: videoLength,
      quality: videoQuality as "fast" | "balanced" | "high",
      hfToken: "",
    });
  }

  // Step 3: Generate thumbnail
  console.log(`[Queue] Generating thumbnail for video ${videoId}`);
  const thumbnail = await generateImage({
    prompt: `Product thumbnail for ${video.productName}. Clean, professional, eye-catching. Show the product clearly with vibrant colors. TikTok cover image.`,
  });

  // Step 4: Generate caption
  console.log(`[Queue] Generating caption for video ${videoId}`);
  const captionResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are a TikTok caption and hashtag expert. Create engaging captions with viral hashtags. Keep captions short, punchy, and include relevant emojis. Generate 10-15 hashtags mixing popular and niche tags.",
      },
      {
        role: "user",
        content: `Create a TikTok caption and hashtags for this product: ${video.productName}\n\nDescription: ${video.productDescription}`,
      },
    ],
  });

  const captionContent = captionResponse.choices[0].message.content;
  const caption = typeof captionContent === "string" ? captionContent : (captionContent[0] as any).text;

  // Update video with generated content
  await db.updateVideo(videoId, {
    videoUrl: videoResult.url,
    thumbnailUrl: thumbnail.url,
    caption,
    status: "completed",
  });

  console.log(`[Queue] Successfully processed video ${videoId}`);
}

/**
 * Start the queue processor - runs every 30 seconds
 */
export function startQueueProcessor() {
  console.log("[Queue Processor] Starting background processor (interval: 30s)");

  // Process immediately on start
  processQueueBatch().catch(console.error);

  // Then process every 30 seconds
  setInterval(() => {
    processQueueBatch().catch(console.error);
  }, 30000);
}

/**
 * Stop the queue processor
 */
export function stopQueueProcessor() {
  console.log("[Queue Processor] Stopping background processor");
}
