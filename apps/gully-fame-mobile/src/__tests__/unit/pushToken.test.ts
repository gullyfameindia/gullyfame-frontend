/**
 * pushToken: the notification permission dialog must never appear during sign-in (it is only shown
 * after an explanation, once, or when the user turns push on in Settings). Expo and the API are mocked.
 */
jest.mock("expo/virtual/env", () => ({ env: process.env }));

const mockGetPermissions = jest.fn();
const mockRequestPermissions = jest.fn();
const mockGetDeviceToken = jest.fn();
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: () => mockGetPermissions(),
  requestPermissionsAsync: () => mockRequestPermissions(),
  getDevicePushTokenAsync: () => mockGetDeviceToken(),
}));

const mockRegisterDeviceToken = jest.fn();
jest.mock("@api/services/userService", () => ({
  registerDeviceToken: (...args: unknown[]) => mockRegisterDeviceToken(...args),
}));

const mockStorage = new Map<string, string>();
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockStorage.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => void mockStorage.set(k, v)),
  },
}));

const mockAlert = jest.fn();
jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  Alert: { alert: (...args: unknown[]) => mockAlert(...args) },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const push = require("../../utils/pushToken") as typeof import("../../utils/pushToken");

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  mockStorage.clear();
  [mockGetPermissions, mockRequestPermissions, mockGetDeviceToken, mockRegisterDeviceToken, mockAlert].forEach((m) =>
    m.mockReset()
  );
  mockGetDeviceToken.mockResolvedValue({ data: "fcm-token" });
  mockRegisterDeviceToken.mockResolvedValue(undefined);
});

describe("getNativePushToken", () => {
  it("does not show the system dialog by default", async () => {
    mockGetPermissions.mockResolvedValue({ granted: false, canAskAgain: true });
    await expect(push.getNativePushToken()).resolves.toBe("");
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it("asks when prompt is true and returns the device token if allowed", async () => {
    mockGetPermissions.mockResolvedValue({ granted: false, canAskAgain: true });
    mockRequestPermissions.mockResolvedValue({ granted: true });
    await expect(push.getNativePushToken({ prompt: true })).resolves.toBe("fcm-token");
    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
  });

  it("returns the token without asking when already allowed", async () => {
    mockGetPermissions.mockResolvedValue({ granted: true, canAskAgain: true });
    await expect(push.getNativePushToken()).resolves.toBe("fcm-token");
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });
});

describe("registerPushTokenWithBackend", () => {
  it("saves the token on the profile when permission is already granted", async () => {
    mockGetPermissions.mockResolvedValue({ granted: true, canAskAgain: true });
    await push.registerPushTokenWithBackend();
    expect(mockRegisterDeviceToken).toHaveBeenCalledWith("fcm-token", "android");
  });

  it("does nothing (and does not ask) when permission is missing", async () => {
    mockGetPermissions.mockResolvedValue({ granted: false, canAskAgain: true });
    await push.registerPushTokenWithBackend();
    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(mockRegisterDeviceToken).not.toHaveBeenCalled();
  });
});

describe("askForNotificationsOnce", () => {
  it("explains first, only once, and asks only if the user taps Turn on", async () => {
    mockGetPermissions.mockResolvedValue({ granted: false, canAskAgain: true });
    mockRequestPermissions.mockResolvedValue({ granted: true });

    await push.askForNotificationsOnce();
    expect(mockAlert).toHaveBeenCalledTimes(1);
    expect(mockRequestPermissions).not.toHaveBeenCalled();

    const buttons = mockAlert.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === "Turn on")!.onPress!();
    await flush();
    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    expect(mockRegisterDeviceToken).toHaveBeenCalledWith("fcm-token", "android");

    await push.askForNotificationsOnce();
    expect(mockAlert).toHaveBeenCalledTimes(1);
  });

  it("registers silently when notifications are already allowed", async () => {
    mockGetPermissions.mockResolvedValue({ granted: true, canAskAgain: true });
    await push.askForNotificationsOnce();
    expect(mockAlert).not.toHaveBeenCalled();
    expect(mockRegisterDeviceToken).toHaveBeenCalledTimes(1);
  });

  it("stays quiet when Android will no longer show the dialog", async () => {
    mockGetPermissions.mockResolvedValue({ granted: false, canAskAgain: false });
    await push.askForNotificationsOnce();
    expect(mockAlert).not.toHaveBeenCalled();
  });
});
