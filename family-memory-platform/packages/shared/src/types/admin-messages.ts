export interface AdminMessengerStatsResponse {
  generatedAt: string;
  totalConversations: number;
  messages24h: number;
  openMessageReports: number;
  activeSanctions: number;
}

export interface AdminMessengerParticipantSummary {
  userId: string;
  email: string;
  displayName: string | null;
}

export interface AdminMessengerConversationSummary {
  id: string;
  workspaceId: string;
  workspaceName: string;
  type: 'DIRECT' | 'GROUP' | 'CONTEXT';
  title: string | null;
  contextType: 'PERSON' | 'FAMILY' | 'EVENT' | 'MATCH' | null;
  contextId: string | null;
  participantCount: number;
  participants: AdminMessengerParticipantSummary[];
  messageCount: number;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  updatedAt: string;
  createdAt: string;
}

export interface AdminMessengerConversationListResponse {
  total: number;
  limit: number;
  offset: number;
  items: AdminMessengerConversationSummary[];
}

export interface AdminMessengerConversationDetail {
  id: string;
  workspaceId: string;
  workspaceName: string;
  type: 'DIRECT' | 'GROUP' | 'CONTEXT';
  title: string | null;
  contextType: 'PERSON' | 'FAMILY' | 'EVENT' | 'MATCH' | null;
  contextId: string | null;
  createdBy: { id: string; email: string; displayName: string | null };
  participantCount: number;
  participants: Array<
    AdminMessengerParticipantSummary & {
      platformRole: 'VIEWER' | 'EDITOR' | 'ADMIN';
      joinedAt: string;
      lastReadAt: string | null;
    }
  >;
  messageCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface AdminMessengerMessageSummary {
  id: string;
  conversationId: string;
  senderId: string;
  senderEmail: string;
  senderName: string | null;
  body: string;
  isHidden: boolean;
  hiddenAt: string | null;
  attachmentCount: number;
  createdAt: string;
}

export interface AdminMessengerMessageListResponse {
  total: number;
  limit: number;
  offset: number;
  items: AdminMessengerMessageSummary[];
}

export interface AdminMessageReportSummary {
  id: string;
  category: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; email: string; displayName: string | null };
  message: {
    id: string;
    conversationId: string;
    bodyPreview: string;
    isHidden: boolean;
    sender: { id: string; email: string; displayName: string | null };
    conversationTitle: string | null;
    conversationType: string;
    workspaceName: string;
  } | null;
}

export interface AdminMessageReportListResponse {
  total: number;
  limit: number;
  offset: number;
  items: AdminMessageReportSummary[];
}

export interface AdminMessengerSanctionSummary {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string | null;
  workspaceId: string | null;
  workspaceName: string | null;
  type: 'SEND_BLOCKED';
  reason: string | null;
  expiresAt: string | null;
  isActive: boolean;
  revokedAt: string | null;
  createdByEmail: string;
  createdAt: string;
}

export interface AdminMessengerSanctionListResponse {
  total: number;
  limit: number;
  offset: number;
  items: AdminMessengerSanctionSummary[];
}

export interface AdminMessageExportResponse {
  exportedAt: string;
  conversation: AdminMessengerConversationDetail;
  messages: Array<{
    id: string;
    senderId: string;
    senderEmail: string;
    senderName: string | null;
    body: string;
    isHidden: boolean;
    hiddenAt: string | null;
    attachments: Array<{ mediaId: string; fileName: string | null; mimeType: string }>;
    createdAt: string;
  }>;
}

export interface AdminResolveMessageReportInput {
  status: 'RESOLVED' | 'DISMISSED' | 'UNDER_REVIEW';
  moderatorNote?: string;
  hideMessage?: boolean;
  applySendBlock?: boolean;
  blockScope?: 'PLATFORM' | 'WORKSPACE';
  blockExpiresAt?: string;
}

export interface AdminApplyMessengerSanctionInput {
  userId: string;
  workspaceId?: string;
  reason?: string;
  expiresAt?: string;
}
