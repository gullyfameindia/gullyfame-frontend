import { apiGet, apiPost, apiPut, toResult } from "../client";

/**
 * One-to-one chat.
 * GET  /chat/chatlist?view=archived          -> { chatlist: [{ chatter_user_id, latest_message, last_message_time,
 *                                                 unread_count, name, username, profile_image, archived, pinned, muted }] }
 *                                                (pinned chats first; servers before pin/mute support omit those fields)
 * GET  /chat/chatDetails?chatterId&page&limit -> newest first
 * POST /chat/sendChat { receiver_id, message, reply_to?, is_forwarded? }
 * POST /chat/message/:messageId/react { emoji }
 * POST /chat/message/delete { message_ids[], delete_type: "for_me" | "for_everyone" }
 * PUT  /chat/read { sender_id }
 * POST /chat/archive { chatterId, archived }
 * POST /chat/pin { chatterId, pinned }  ·  POST /chat/mute { chatterId, muted }
 * GET  /chat/search?q                         -> { results: [{ message_id, chatter_user_id, from_me, message, createdAt }] }
 */

export interface ChatListItem {
  chatter_user_id: string;
  latest_message: string;
  last_message_time: string;
  archived: boolean;
  unread_count?: number;
  name?: string;
  username?: string;
  profile_image?: string;
  pinned?: boolean;
  muted?: boolean;
}

export interface ChatSearchResult {
  message_id: string;
  chatter_user_id: string;
  from_me: boolean;
  message: string;
  createdAt: string;
}

export interface ChatReaction {
  user_id: string;
  emoji: string;
}

export interface ChatMessage {
  _id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  createdAt: string;
  updatedAt: string | null;
  is_deleted: boolean;
  is_forwarded: boolean;
  reply_to: string | null;
  reactions: ChatReaction[];
  read_at: string | null;
  is_read?: boolean;
}

export interface ChatDetailsPage {
  page: number;
  limit: number;
  totalMessageCount: number;
  messages: ChatMessage[];
}

export type DeleteType = "for_me" | "for_everyone";

export const MESSAGE_MAX_LENGTH = 2000;

export const getChatList = (view: "all" | "archived" = "all") =>
  apiGet<{ chatlist: ChatListItem[] }>("chat/chatlist", {
    params: view === "archived" ? { view: "archived" } : undefined,
  });

export const getChatDetails = (chatterId: string, page = 1, limit = 30) =>
  apiGet<ChatDetailsPage>("chat/chatDetails", { params: { chatterId, page, limit } });

export const sendMessage = (receiverId: string, message: string, replyTo?: string | null, isForwarded = false) =>
  apiPost<{ message: ChatMessage }>("chat/sendChat", {
    receiver_id: receiverId,
    message: message.trim(),
    ...(replyTo ? { reply_to: replyTo } : {}),
    ...(isForwarded ? { is_forwarded: true } : {}),
  });

export const toggleReaction = (messageId: string, emoji: string) =>
  apiPost<{ messageId: string; reactions: ChatReaction[] }>(`chat/message/${messageId}/react`, { emoji });

export const deleteMessages = (messageIds: string[], deleteType: DeleteType) =>
  apiPost("chat/message/delete", { message_ids: messageIds, delete_type: deleteType });

/** Marks everything `senderId` sent me as read. */
export const markConversationRead = (senderId: string) => apiPut<{ read_at: string }>("chat/read", { sender_id: senderId });

export const setArchived = (chatterId: string, archived: boolean) =>
  apiPost<{ chatterId: string; archived: boolean }>("chat/archive", { chatterId, archived });

export const setPinned = (chatterId: string, pinned: boolean) =>
  apiPost<{ chatterId: string; pinned: boolean }>("chat/pin", { chatterId, pinned });

export const setMuted = (chatterId: string, muted: boolean) =>
  apiPost<{ chatterId: string; muted: boolean }>("chat/mute", { chatterId, muted });

/** Messages (sent or received) containing `q`; the server needs 2+ characters. */
export const searchMessages = (q: string) =>
  apiGet<{ results: ChatSearchResult[] }>("chat/search", { params: { q } });

/**
 * Clears a whole conversation for the signed-in user only. There is no
 * conversation-delete endpoint, so every message is deleted "for_me".
 */
export async function clearConversationForMe(chatterId: string): Promise<void> {
  const ids: string[] = [];
  for (let page = 1; page <= 50; page++) {
    const res = await getChatDetails(chatterId, page, 100);
    ids.push(...res.messages.map((m) => m._id));
    if (page * 100 >= res.totalMessageCount || res.messages.length === 0) break;
  }
  for (let i = 0; i < ids.length; i += 200) {
    await deleteMessages(ids.slice(i, i + 200), "for_me");
  }
}

export const chatService = {
  getChatList: (view: "all" | "archived" = "all") => toResult(() => getChatList(view)),
  getChatDetails,
  sendMessage,
  toggleReaction,
  deleteMessages,
  markConversationRead,
  setArchived,
  setPinned,
  setMuted,
  searchMessages,
};

export default chatService;
