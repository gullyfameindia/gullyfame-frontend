import { AppState, type AppStateStatus } from "react-native";
import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "@/config/env";
import { getAuthToken } from "../client";
import type { ChatMessage } from "./chatService";

/**
 * Real-time chat delivery.
 *
 * The backend runs Socket.IO on the API host (default namespace). It
 * authenticates with `auth.token` and joins each user to their own room.
 * The only event it emits is `new_message` (the receiver gets the same
 * payload POST /chat/sendChat returns). Sending, reading, reacting and
 * deleting all stay on REST.
 */

type MessageListener = (message: ChatMessage) => void;
type StatusListener = (connected: boolean) => void;

class SocketChatService {
  private socket: Socket | null = null;
  private connecting: Promise<void> | null = null;
  private messageListeners = new Set<MessageListener>();
  private statusListeners = new Set<StatusListener>();
  /** True while the user is signed in and wants live chat (between connect() and disconnect()). */
  private wanted = false;
  private appStateSubscription: { remove: () => void } | null = null;

  /**
   * The socket is closed while the app is in the background (no wasted battery/data, and the
   * server is not holding thousands of idle connections) and reopened when it returns.
   */
  private watchAppState() {
    if (this.appStateSubscription) return;
    this.appStateSubscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (!this.wanted) return;
      if (state === "active") {
        this.connect();
      } else if (state === "background") {
        this.socket?.removeAllListeners();
        this.socket?.disconnect();
        this.socket = null;
        this.statusListeners.forEach((l) => l(false));
      }
    });
  }

  /** Opens (or reuses) the single socket for the signed-in user. */
  connect(): Promise<void> {
    this.wanted = true;
    this.watchAppState();
    if (this.socket?.connected) return Promise.resolve();
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      const token = await getAuthToken();
      if (!token) return;

      this.socket?.removeAllListeners();
      this.socket?.disconnect();

      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
        // Exponential backoff 1s -> 30s with +/-50% jitter, so clients do not reconnect in lockstep
        // after a server restart.
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        randomizationFactor: 0.5,
      });

      socket.on("connect", () => this.statusListeners.forEach((l) => l(true)));
      socket.on("disconnect", () => this.statusListeners.forEach((l) => l(false)));
      socket.on("connect_error", (err) => {
        // A bad token will never succeed; stop retrying until the next login.
        if (err?.message === "invalid_token") socket.disconnect();
        this.statusListeners.forEach((l) => l(false));
      });
      socket.on("new_message", (message: ChatMessage) => {
        this.messageListeners.forEach((l) => l(message));
      });

      this.socket = socket;
    })().finally(() => {
      this.connecting = null;
    });

    return this.connecting;
  }

  /** Subscribe to incoming messages. Returns an unsubscribe function. */
  onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  isConnected(): boolean {
    return !!this.socket?.connected;
  }

  /** Called on logout. */
  disconnect(): void {
    this.wanted = false;
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketChatService = new SocketChatService();
