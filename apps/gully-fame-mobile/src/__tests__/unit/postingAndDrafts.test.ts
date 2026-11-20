/**
 * Posting and drafts: the body sent to /reels/publish and /reels/draft.
 * The API client and file uploads are mocked, so no network is used.
 */
jest.mock("expo/virtual/env", () => ({ env: process.env }));
jest.mock("expo-file-system/legacy", () => ({ FileSystemUploadType: { MULTIPART: 1 }, uploadAsync: jest.fn() }));

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
jest.mock("../../api/client", () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  ApiError: class ApiError extends Error {},
  toResult: async (fn: () => Promise<unknown>, message = "success") => ({ success: true, data: await fn(), message }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const upload = require("../../api/services/videoUploadService") as typeof import("../../api/services/videoUploadService");

const base = { title: "Untitled Reel", duration: 12, resolution: "1080p" as const, fps: 30 };

beforeEach(() => {
  mockApiGet.mockReset();
  mockApiPost.mockReset();
  mockApiPost.mockResolvedValue({ _id: "r1" });
});

describe("captionWithTags (F22)", () => {
  it("adds hashtags after the caption", () => {
    expect(upload.captionWithTags("My dance", ["dance", "#viral"])).toBe("My dance\n\n#dance #viral");
  });
  it("does not repeat tags already in the caption (any case) or empty tags", () => {
    expect(upload.captionWithTags("Loving #Dance", ["dance", " ", "dance", "fun"])).toBe("Loving #Dance\n\n#fun");
  });
  it("works with no caption or no tags", () => {
    expect(upload.captionWithTags("", ["music"])).toBe("#music");
    expect(upload.captionWithTags("  just text ", undefined)).toBe("just text");
  });
});

describe("publishReel", () => {
  it("sends the video, caption with tags, competition and music", async () => {
    await upload.publishReel("https://cdn/v.mp4", {
      ...base,
      description: "Sing off entry",
      thumbnail: "https://cdn/t.jpg",
      tags: ["music"],
      competitionId: "c1",
      music: { trackId: "a1", title: "Song" },
    });
    expect(mockApiPost).toHaveBeenCalledWith("reels/publish", {
      video_url: "https://cdn/v.mp4",
      thumbnail_url: "https://cdn/t.jpg",
      caption: "Sing off entry\n\n#music",
      competitionId: "c1",
      music: { id: "a1", name: "Song" },
    });
  });

  it("promotes a saved draft by sending its reelId", async () => {
    await upload.publishReel("https://cdn/v.mp4", { ...base, description: "x", draftReelId: "d9" });
    expect(mockApiPost.mock.calls[0][1]).toMatchObject({ reelId: "d9", music: { id: "", name: "" } });
    expect(mockApiPost.mock.calls[0][1]).not.toHaveProperty("competitionId");
  });
});

describe("drafts", () => {
  it("saves a new draft, or updates one by id", async () => {
    await upload.saveDraft("https://cdn/v.mp4", { ...base, description: "wip" });
    expect(mockApiPost.mock.calls[0][0]).toBe("reels/draft");
    expect(mockApiPost.mock.calls[0][1]).not.toHaveProperty("reelId");
    await upload.saveDraft("https://cdn/v.mp4", { ...base, description: "wip" }, "d1");
    expect(mockApiPost.mock.calls[1][1]).toMatchObject({ reelId: "d1", caption: "wip" });
  });

  it("returns null when the server has no draft ({})", async () => {
    mockApiGet.mockResolvedValue({});
    await expect(upload.getLatestDraft()).resolves.toBeNull();
    mockApiGet.mockResolvedValue({ _id: "d1", status: "draft" });
    await expect(upload.getLatestDraft()).resolves.toMatchObject({ _id: "d1" });
  });
});
