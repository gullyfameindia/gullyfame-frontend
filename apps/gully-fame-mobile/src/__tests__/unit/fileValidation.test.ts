import { validatePickedAsset, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "../../utils/fileValidation";
import { safeIdParam, stringParam } from "../../utils/routeParams";
import { isSafeIncomingLink, sanitizeIncomingLink } from "../../utils/deepLink";
import { MAX_GET_RETRIES, RETRYABLE_STATUS, backoffDelayMs, parseRetryAfterMs } from "../../api/retryPolicy";
import { safeDecode } from "../../utils/routeParams";

describe("validatePickedAsset", () => {
  it("accepts a normal photo", () => {
    expect(validatePickedAsset({ uri: "file:///a/b.jpg", type: "image", mimeType: "image/jpeg", fileSize: 1000 }, ["image"])).toBeNull();
  });

  it("accepts a photo with no mime type by falling back to the extension", () => {
    expect(validatePickedAsset({ uri: "file:///a/b.HEIC" }, ["image"])).toBeNull();
  });

  it("rejects a video when only images are allowed", () => {
    expect(validatePickedAsset({ uri: "file:///a/b.mp4", type: "video", mimeType: "video/mp4" }, ["image"])).not.toBeNull();
  });

  it("accepts photos and videos when both are allowed", () => {
    expect(validatePickedAsset({ uri: "file:///a/b.mov", mimeType: "video/quicktime" }, ["image", "video"])).toBeNull();
    expect(validatePickedAsset({ uri: "file:///a/b.png", mimeType: "image/png" }, ["image", "video"])).toBeNull();
  });

  it("rejects SVG, PDF and unknown types", () => {
    expect(validatePickedAsset({ uri: "file:///a/b.svg", mimeType: "image/svg+xml" }, ["image"])).not.toBeNull();
    expect(validatePickedAsset({ uri: "file:///a/b.pdf", mimeType: "application/pdf" }, ["image", "video"])).not.toBeNull();
    expect(validatePickedAsset({ uri: "file:///a/b.exe" }, ["image", "video"])).not.toBeNull();
  });

  it("enforces the image and video size limits", () => {
    expect(validatePickedAsset({ uri: "file:///a.jpg", mimeType: "image/jpeg", fileSize: MAX_IMAGE_BYTES + 1 }, ["image"])).toMatch(/too large/);
    expect(validatePickedAsset({ uri: "file:///a.jpg", mimeType: "image/jpeg", fileSize: MAX_IMAGE_BYTES }, ["image"])).toBeNull();
    expect(validatePickedAsset({ uri: "file:///a.mp4", mimeType: "video/mp4", fileSize: MAX_VIDEO_BYTES + 1 }, ["video"])).toMatch(/too large/);
  });

  it("skips the size check when the platform does not report a size", () => {
    expect(validatePickedAsset({ uri: "file:///a.mp4", mimeType: "video/mp4" }, ["video"])).toBeNull();
  });

  it("rejects an asset without a uri", () => {
    expect(validatePickedAsset({ uri: "" }, ["image"])).not.toBeNull();
  });

  it("ignores query strings when reading the extension", () => {
    expect(validatePickedAsset({ uri: "file:///a/b.jpg?token=1" }, ["image"])).toBeNull();
  });
});

describe("route param validation", () => {
  it("accepts plain ids", () => {
    expect(safeIdParam("64f1c2a9e4b0a1b2c3d4e5f6")).toBe("64f1c2a9e4b0a1b2c3d4e5f6");
    expect(safeIdParam("user_12-ab")).toBe("user_12-ab");
  });

  it("takes the first element of an array", () => {
    expect(safeIdParam(["abc123", "def"])).toBe("abc123");
  });

  it("rejects path traversal, query injection, empty and non-string values", () => {
    expect(safeIdParam("../admin")).toBe("");
    expect(safeIdParam("abc/def")).toBe("");
    expect(safeIdParam("abc?x=1")).toBe("");
    expect(safeIdParam("a b")).toBe("");
    expect(safeIdParam("")).toBe("");
    expect(safeIdParam(undefined)).toBe("");
    expect(safeIdParam(42)).toBe("");
    expect(safeIdParam("x".repeat(65))).toBe("");
  });

  it("stringParam returns a string or empty", () => {
    expect(stringParam("hi")).toBe("hi");
    expect(stringParam(["a", "b"])).toBe("a");
    expect(stringParam(undefined)).toBe("");
  });
});


describe("deep link vetting", () => {
  it("passes normal links through unchanged", () => {
    expect(sanitizeIncomingLink("/competition/live/64f1c2a9e4b0a1b2c3d4e5f6")).toBe("/competition/live/64f1c2a9e4b0a1b2c3d4e5f6");
    expect(sanitizeIncomingLink("gullyfame://profile/abc?tab=reels")).toBe("gullyfame://profile/abc?tab=reels");
    expect(isSafeIncomingLink("/search?q=hello%20world")).toBe(true);
  });

  it("rejects malformed percent-encoding (the exponential-decode trigger)", () => {
    expect(sanitizeIncomingLink("/x?a=%")).toBe("/");
    expect(sanitizeIncomingLink("/x?a=%zz")).toBe("/");
    expect(sanitizeIncomingLink("/x?a=" + "%".repeat(50))).toBe("/");
  });

  it("rejects very long links and long runs of encoded characters (the quadratic-decode trigger)", () => {
    expect(sanitizeIncomingLink("/x?a=" + "a".repeat(3000))).toBe("/");
    expect(sanitizeIncomingLink("/x?a=" + "%41".repeat(200))).toBe("/");
  });

  it("rejects path traversal and control characters", () => {
    expect(sanitizeIncomingLink("/profile/../admin")).toBe("/");
    expect(sanitizeIncomingLink("/profile/%2e%2e/admin")).toBe("/");
    expect(sanitizeIncomingLink("/a\u0000b")).toBe("/");
  });

  it("falls back to the root for non-strings and empty values", () => {
    expect(sanitizeIncomingLink(undefined)).toBe("/");
    expect(sanitizeIncomingLink(42)).toBe("/");
    expect(sanitizeIncomingLink("")).toBe("/");
  });
});

describe("retry policy", () => {
  it("backs off exponentially with jitter inside [ceiling/2, ceiling]", () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const ceiling = Math.min(8000, 500 * 2 ** attempt);
      for (let i = 0; i < 50; i++) {
        const delay = backoffDelayMs(attempt);
        expect(delay).toBeGreaterThanOrEqual(ceiling / 2);
        expect(delay).toBeLessThanOrEqual(ceiling);
      }
    }
  });

  it("never exceeds the cap, even for large attempt numbers", () => {
    expect(backoffDelayMs(30)).toBeLessThanOrEqual(8000);
  });

  it("parses Retry-After seconds and dates, capped at 10 seconds", () => {
    expect(parseRetryAfterMs("3")).toBe(3000);
    expect(parseRetryAfterMs("120")).toBe(10000);
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(parseRetryAfterMs("Thu, 01 Jan 2026 00:00:04 GMT", now)).toBe(4000);
    expect(parseRetryAfterMs("Wed, 31 Dec 2025 23:59:00 GMT", now)).toBe(0);
  });

  it("ignores missing or malformed Retry-After values", () => {
    expect(parseRetryAfterMs(undefined)).toBeNull();
    expect(parseRetryAfterMs("")).toBeNull();
    expect(parseRetryAfterMs("soon")).toBeNull();
  });

  it("retries reads only for rate-limit and gateway statuses, and a bounded number of times", () => {
    expect([...RETRYABLE_STATUS].sort()).toEqual([429, 502, 503, 504]);
    expect(RETRYABLE_STATUS.has(400)).toBe(false);
    expect(RETRYABLE_STATUS.has(401)).toBe(false);
    expect(RETRYABLE_STATUS.has(500)).toBe(false);
    expect(MAX_GET_RETRIES).toBeLessThanOrEqual(3);
  });
});

describe("safeDecode", () => {
  it("decodes normal encoded text", () => {
    expect(safeDecode("hello%20world")).toBe("hello world");
  });

  it("does not throw on a literal percent sign (already-decoded router param)", () => {
    expect(safeDecode("100% real")).toBe("100% real");
    expect(safeDecode("%")).toBe("%");
    expect(safeDecode("%E0%A4%A")).toBe("%E0%A4%A");
  });

  it("handles arrays, numbers and missing values", () => {
    expect(safeDecode(["a%20b", "c"])).toBe("a b");
    expect(safeDecode(42)).toBe("42");
    expect(safeDecode(undefined)).toBe("");
    expect(safeDecode(null)).toBe("");
  });
});
