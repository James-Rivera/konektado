import type { ConversationMessage, ConversationSummary } from '@/types/marketplace.types';

export type ConversationPreviewEvent = {
  conversationId: string;
  message: ConversationMessage;
};

type ConversationPreviewListener = (event: ConversationPreviewEvent) => void;

const listeners = new Set<ConversationPreviewListener>();
let cachedConversations: ConversationSummary[] | null = null;
let cachedUserId: string | null = null;

export function emitConversationPreviewUpdate(event: ConversationPreviewEvent) {
  cachedConversations = reconcilePreview(cachedConversations, event);
  listeners.forEach((listener) => listener(event));
}

export function subscribeConversationPreviewUpdates(listener: ConversationPreviewListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getConversationPreviewCache(userId?: string | null) {
  if (userId && cachedUserId && cachedUserId !== userId) return null;
  return cachedConversations;
}

export function setConversationPreviewCache(conversations: ConversationSummary[], userId?: string | null) {
  cachedUserId = userId ?? cachedUserId;
  cachedConversations = sortConversationsByUpdatedAt(conversations);
}

export function updateConversationPreviewCache(event: ConversationPreviewEvent) {
  cachedConversations = reconcilePreview(cachedConversations, event);
  return cachedConversations;
}

function reconcilePreview(
  conversations: ConversationSummary[] | null,
  event: ConversationPreviewEvent,
) {
  if (!conversations) return conversations;

  let found = false;
  const updated = conversations.map((conversation) => {
    if (conversation.id !== event.conversationId) return conversation;
    found = true;
    return {
      ...conversation,
      lastMessage: event.message,
      updatedAt: event.message.createdAt,
    };
  });

  return found ? sortConversationsByUpdatedAt(updated) : conversations;
}

function sortConversationsByUpdatedAt(conversations: ConversationSummary[]) {
  return [...conversations].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}
