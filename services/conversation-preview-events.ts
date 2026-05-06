import type { ConversationMessage, ConversationSummary } from '@/types/marketplace.types';

export type ConversationPreviewEvent = {
  conversationId: string;
  conversation?: ConversationSummary;
  message?: ConversationMessage;
  userId?: string | null;
};

type ConversationPreviewListener = (event: ConversationPreviewEvent) => void;

const listeners = new Set<ConversationPreviewListener>();
let cachedConversations: ConversationSummary[] | null = null;
let cachedUserId: string | null = null;

export function emitConversationPreviewUpdate(event: ConversationPreviewEvent) {
  if (event.userId) cachedUserId = event.userId;
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
  if (!userId) return null;
  if (cachedUserId !== userId) return null;
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
  if (!conversations) return event.conversation ? [event.conversation] : conversations;

  let found = false;
  const updated = conversations.map((conversation) => {
    if (conversation.id !== event.conversationId) return conversation;
    found = true;
    if (event.conversation) {
      return mergeConversationPreview(conversation, event.conversation);
    }
    if (!event.message) return conversation;
    return {
      ...conversation,
      lastMessage: event.message,
      updatedAt: event.message.createdAt,
    };
  });

  if (!found && event.conversation) {
    updated.push(event.conversation);
  }

  return found || event.conversation ? sortConversationsByUpdatedAt(updated) : conversations;
}

function mergeConversationPreview(
  current: ConversationSummary,
  incoming: ConversationSummary,
) {
  const currentLastTime = current.lastMessage?.createdAt
    ? new Date(current.lastMessage.createdAt).getTime()
    : 0;
  const incomingLastTime = incoming.lastMessage?.createdAt
    ? new Date(incoming.lastMessage.createdAt).getTime()
    : 0;
  const lastMessage =
    incomingLastTime >= currentLastTime
      ? incoming.lastMessage
      : current.lastMessage;

  return {
    ...current,
    ...incoming,
    lastMessage,
    updatedAt: latestTimestamp(current.updatedAt, incoming.updatedAt, lastMessage?.createdAt),
  };
}

function sortConversationsByUpdatedAt(conversations: ConversationSummary[]) {
  return [...conversations].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

function latestTimestamp(...values: (string | null | undefined)[]) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? new Date().toISOString();
}
