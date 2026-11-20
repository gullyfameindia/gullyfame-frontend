/** Category screen data (N1): competitions are requested by category and grouped by status. */
jest.mock("expo/virtual/env", () => ({ env: process.env }));

const mockApiGet = jest.fn();
jest.mock("../../api/client", () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: jest.fn(),
  toResult: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const comps = require("../../api/services/competitionService") as typeof import("../../api/services/competitionService");

beforeEach(() => mockApiGet.mockReset());

it("sends the category and normalizes statuses across pages", async () => {
  mockApiGet
    .mockResolvedValueOnce({ hasMore: true, results: [{ _id: "a", title: "A", status: "live", prize: 100, participants: 2, image: "i.jpg" }] })
    .mockResolvedValueOnce({ hasMore: false, results: [{ _id: "b", title: "B", status: "COMPLETED", prize: 0, participants: 0 }] });
  const list = await comps.listCompetitionsByCategory("Fashion & Beauty");
  expect(mockApiGet).toHaveBeenNthCalledWith(1, "search", {
    params: { q: "", type: "competitions", page: 1, limit: 50, category: "Fashion & Beauty" },
  });
  expect(list.map((c) => [c._id, c.normalizedStatus, c.imageUrl])).toEqual([
    ["a", "LIVE", "i.jpg"],
    ["b", "ENDED", ""],
  ]);
});
