import { describe, it, expect } from "vitest";
import { calculateEngagement, getTrendingMetrics, formatMetric } from "./analytics";

describe("Analytics", () => {
  describe("calculateEngagement", () => {
    it("should calculate engagement rate correctly", () => {
      const engagement = calculateEngagement(100, 50, 25, 1000);
      expect(engagement).toBe(17.5); // (100 + 50 + 25) / 1000 * 100
    });

    it("should return 0 for zero views", () => {
      const engagement = calculateEngagement(100, 50, 25, 0);
      expect(engagement).toBe(0);
    });

    it("should handle high engagement", () => {
      const engagement = calculateEngagement(500, 200, 100, 1000);
      expect(engagement).toBe(80); // (500 + 200 + 100) / 1000 * 100
    });
  });

  describe("getTrendingMetrics", () => {
    it("should return top performers sorted by views", () => {
      const videos = [
        { id: 1, views: 1000, likes: 100, comments: 50, shares: 25, engagement: 17.5 },
        { id: 2, views: 5000, likes: 500, comments: 200, shares: 100, engagement: 16 },
        { id: 3, views: 3000, likes: 300, comments: 100, shares: 50, engagement: 15 },
      ];

      const metrics = getTrendingMetrics(videos);

      expect(metrics.topPerformers).toHaveLength(3);
      expect(metrics.topPerformers[0].id).toBe(2); // Highest views
      expect(metrics.topPerformers[1].id).toBe(3);
      expect(metrics.topPerformers[2].id).toBe(1);
    });

    it("should calculate correct totals", () => {
      const videos = [
        { id: 1, views: 1000, likes: 100 },
        { id: 2, views: 2000, likes: 200 },
      ];

      const metrics = getTrendingMetrics(videos);

      expect(metrics.totalViews).toBe(3000);
      expect(metrics.totalLikes).toBe(300);
    });

    it("should handle empty videos array", () => {
      const metrics = getTrendingMetrics([]);

      expect(metrics.topPerformers).toHaveLength(0);
      expect(metrics.totalViews).toBe(0);
      expect(metrics.totalLikes).toBe(0);
      expect(metrics.averageEngagement).toBe(0);
    });
  });

  describe("formatMetric", () => {
    it("should format millions correctly", () => {
      expect(formatMetric(1500000)).toBe("1.5M");
    });

    it("should format thousands correctly", () => {
      expect(formatMetric(1500)).toBe("1.5K");
    });

    it("should return raw number for small values", () => {
      expect(formatMetric(500)).toBe("500");
    });

    it("should handle edge cases", () => {
      expect(formatMetric(0)).toBe("0");
      expect(formatMetric(1000000)).toBe("1.0M");
    });
  });
});
