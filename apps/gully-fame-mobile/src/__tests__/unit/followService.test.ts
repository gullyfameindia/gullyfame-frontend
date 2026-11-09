/**
 * followService: the list normalizer and the request it builds. The API client is mocked, so no
 * network is used. Shapes follow the production envelope { page, limit, total, totalPages, users }.
 */
jest.mock("expo/virtual/env", () => ({ env: process.env }));

const mockApiGet = jest.fn();
jest.mock("../../api/client", () => ({ apiGet: (...args: unknown[]) => mockApiGet(...args) }));
jest.mock("@/utils/mediaUrl", () => ({
  resolveMediaUrl: (v: string | null) => (v ? `https://cdn.test/${v}` : null),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { toFollowUser, getFollowList } = require("../../api/services/followService") as typeof import("../../api/services/followService");

beforeEach(() => mockApiGet.mockReset());

describe("toFollowUser", () => {
  it("reads a plain user document", () => {
    expect(
      toFollowUser({ _id: "u1", firstName: "Asha", lastName: "Rao", username: "asha", profileImage: "a.jpg", role: "PARTICIPANT" }, "followers")
    ).toEqual({ id: "u1", name: "Asha Rao", username: "asha", avatar: "https://cdn.test/a.jpg", role: "PARTICIPANT" });
  });

  it("unwraps a follow record by list kind", () => {
    const record = { _id: "f1", follower: { _id: "u2", firstName: "Ravi" }, following: { _id: "me" } };
    expect(toFollowUser(record, "followers")?.id).toBe("u2");
    expect(toFollowUser(record, "following")?.id).toBe("me");
  });

  it("falls back to the username, then a generic name", () => {
    expect(toFollowUser({ id: "u3", username: "kd" }, "following")?.name).toBe("kd");
    expect(toFollowUser({ id: "u4" }, "following")?.name).toBe("Gully Fame user");
  });

  it("drops entries without an id", () => {
    expect(toFollowUser({ firstName: "No id" }, "followers")).toBeNull();
    expect(toFollowUser(null, "followers")).toBeNull();
    expect(toFollowUser("u5", "followers")).toBeNull();
  });
});

describe("getFollowList", () => {
  it("calls the signed-in user's list with paging params", async () => {
    mockApiGet.mockResolvedValue({ page: 1, limit: 20, total: 0, totalPages: 0, users: [] });
    const result = await getFollowList("followers");
    expect(mockApiGet).toHaveBeenCalledWith("user/followers", { params: { page: 1, limit: 20 } });
    expect(result).toEqual({ users: [], total: 0, page: 1, hasMore: false });
  });

  it("calls another user's list and reports more pages", async () => {
    mockApiGet.mockResolvedValue({ page: 1, limit: 2, total: 3, totalPages: 2, users: [{ _id: "a" }, { _id: "b" }, { bad: true }] });
    const result = await getFollowList("following", { userId: "abc 1", limit: 2 });
    expect(mockApiGet).toHaveBeenCalledWith("user/abc%201/following", { params: { page: 1, limit: 2 } });
    expect(result.users.map((u) => u.id)).toEqual(["a", "b"]);
    expect(result.total).toBe(3);
    expect(result.hasMore).toBe(true);
  });

  it("survives a missing payload", async () => {
    mockApiGet.mockResolvedValue(null);
    expect(await getFollowList("following", { page: 2 })).toEqual({ users: [], total: 0, page: 2, hasMore: false });
  });
});
