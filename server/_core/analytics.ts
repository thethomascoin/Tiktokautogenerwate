/**
 * Analytics service for tracking video performance
 * In production, this would integrate with TikTok API
 */

export interface VideoMetrics {
  videoId: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  tiktokPostId?: string;
}

/**
 * Calculate engagement rate
 */
export function calculateEngagement(
  likes: number,
  comments: number,
  shares: number,
  views: number
): number {
  if (views === 0) return 0;
  return ((likes + comments + shares) / views) * 100;
}

/**
 * Get metrics from TikTok API (placeholder)
 * In production, use TikTok Business API with OAuth token
 */
export async function fetchVideoMetrics(
  tiktokPostId: string,
  accessToken?: string
): Promise<VideoMetrics | null> {
  if (!tiktokPostId) return null;

  try {
    // Placeholder: In production, call TikTok Business API
    // const response = await fetch(
    //   `https://open.tiktokapis.com/v1/video/query/`,
    //   {
    //     method: 'POST',
    //     headers: {
    //       'Authorization': `Bearer ${accessToken}`,
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       filters: {
    //         video_ids: [tiktokPostId],
    //       },
    //       fields: ['id', 'view_count', 'like_count', 'comment_count', 'share_count'],
    //     }),
    //   }
    // );

    // For now, return mock data
    const mockMetrics = {
      views: Math.floor(Math.random() * 50000) + 1000,
      likes: Math.floor(Math.random() * 5000) + 100,
      comments: Math.floor(Math.random() * 500) + 10,
      shares: Math.floor(Math.random() * 200) + 5,
    };

    return {
      videoId: 0,
      ...mockMetrics,
      engagement: calculateEngagement(
        mockMetrics.likes,
        mockMetrics.comments,
        mockMetrics.shares,
        mockMetrics.views
      ),
      tiktokPostId,
    };
  } catch (error) {
    console.error("Failed to fetch video metrics:", error);
    return null;
  }
}

/**
 * Get trending metrics across all videos
 */
export function getTrendingMetrics(videos: any[]): {
  topPerformers: any[];
  averageEngagement: number;
  totalViews: number;
  totalLikes: number;
} {
  const topPerformers = videos
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 5);

  const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalLikes = videos.reduce((sum, v) => sum + (v.likes || 0), 0);
  const averageEngagement =
    videos.length > 0
      ? videos.reduce((sum, v) => sum + (v.engagement || 0), 0) / videos.length
      : 0;

  return {
    topPerformers,
    averageEngagement,
    totalViews,
    totalLikes,
  };
}

/**
 * Format large numbers for display
 */
export function formatMetric(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + "M";
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + "K";
  }
  return value.toString();
}
