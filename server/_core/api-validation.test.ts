import { describe, it, expect } from "vitest";

describe("API Credentials Validation", () => {
  it("should have TikTok API credentials configured", () => {
    expect(process.env.TIKTOK_CLIENT_ID).toBeDefined();
    expect(process.env.TIKTOK_CLIENT_SECRET).toBeDefined();
    // Secrets removed to prevent repo policy violations
  });

  it("should have Hugging Face API token configured", () => {
    expect(process.env.HUGGING_FACE_API_TOKEN).toBeDefined();
    // Token removed to prevent repo policy violations
  });

  it("should validate TikTok API credentials format", () => {
    const clientId = process.env.TIKTOK_CLIENT_ID;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

    // TikTok client ID should be alphanumeric
    expect(clientId).toMatch(/^[a-z0-9]+$/);
    // TikTok client secret should be present and non-empty
    expect(clientSecret).toBeTruthy();
    expect(clientSecret?.length).toBeGreaterThan(20);
  });

  it("should validate Hugging Face token format", () => {
    const token = process.env.HUGGING_FACE_API_TOKEN;

    // HF tokens start with 'hf_'
    expect(token).toMatch(/^hf_/);
    expect(token?.length).toBeGreaterThan(20);
  });
});
