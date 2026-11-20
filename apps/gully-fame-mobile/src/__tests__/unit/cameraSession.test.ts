/**
 * cameraSession: recorded clips survive the app being closed before posting, only for the same
 * competition, only while their files exist, and are forgotten once discarded or posted.
 */
const mockStorage = new Map<string, string>();
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockStorage.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => void mockStorage.set(k, v)),
    removeItem: jest.fn(async (k: string) => void mockStorage.delete(k)),
  },
}));

const mockExisting = new Set<string>();
jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: jest.fn(async (uri: string) => ({ exists: mockExisting.has(uri) })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const session = require("../../utils/cameraSession") as typeof import("../../utils/cameraSession");

const clipA = { id: "a", uri: "file:///cache/a.mp4", duration: 3 };
const clipB = { id: "b", uri: "file:///cache/b.mp4", duration: 4 };

beforeEach(() => {
  mockStorage.clear();
  mockExisting.clear();
  mockExisting.add(clipA.uri);
  mockExisting.add(clipB.uri);
});

it("restores saved clips for a normal post", async () => {
  await session.saveCameraSession([clipA, clipB], null);
  await expect(session.loadCameraSession(null)).resolves.toEqual([clipA, clipB]);
});

it("only restores clips recorded for the same competition", async () => {
  await session.saveCameraSession([clipA], "comp-1");
  await expect(session.loadCameraSession(null)).resolves.toEqual([]);
  await expect(session.loadCameraSession("comp-2")).resolves.toEqual([]);
  await expect(session.loadCameraSession("comp-1")).resolves.toEqual([clipA]);
});

it("drops clips whose files are gone", async () => {
  await session.saveCameraSession([clipA, clipB], null);
  mockExisting.delete(clipA.uri);
  await expect(session.loadCameraSession(null)).resolves.toEqual([clipB]);
});

it("ignores non-file uris", async () => {
  await session.saveCameraSession([{ id: "c", uri: "content://media/1", duration: 1 }], null);
  await expect(session.loadCameraSession(null)).resolves.toEqual([]);
});

it("forgets the session when the list becomes empty or is cleared", async () => {
  await session.saveCameraSession([clipA], null);
  await session.saveCameraSession([], null);
  await expect(session.loadCameraSession(null)).resolves.toEqual([]);

  await session.saveCameraSession([clipA], null);
  await session.clearCameraSession();
  await expect(session.loadCameraSession(null)).resolves.toEqual([]);
});

it("does not offer sessions older than three days", async () => {
  const now = Date.now();
  const spy = jest.spyOn(Date, "now").mockReturnValue(now - 4 * 24 * 60 * 60 * 1000);
  await session.saveCameraSession([clipA], null);
  spy.mockReturnValue(now);
  await expect(session.loadCameraSession(null)).resolves.toEqual([]);
  spy.mockRestore();
});

it("survives corrupt storage", async () => {
  mockStorage.set("@gullyfame_camera_session", "{not json");
  await expect(session.loadCameraSession(null)).resolves.toEqual([]);
});
