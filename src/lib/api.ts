const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getToken = () => localStorage.getItem('token');

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

export const api = {
  async register(email: string, username: string, password: string) {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
    } catch {
      throw new Error('Сервер недоступен');
    }
    if (!res.ok) {
      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // ignore parse errors
      }
      throw new Error(data.error || 'Registration failed');
    }
    return res.json();
  },

  async login(email: string, password: string) {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      throw new Error('Сервер недоступен');
    }
    if (!res.ok) {
      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // ignore parse errors
      }
      if (res.status === 400 || res.status === 401) {
        throw new Error('Неверные данные для входа');
      }
      throw new Error(data.error || 'Login failed');
    }
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${API_URL}/api/auth/me`, { headers: headers(), credentials: 'include' });
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  },

  async updateProfile(data: { username?: string; avatar?: string }) {
    const res = await fetch(`${API_URL}/api/users/profile`, {
      method: 'PUT',
      credentials: 'include',
      headers: headers(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async searchUsers(query: string) {
    const res = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
      credentials: 'include',
      headers: headers(),
    });
    return res.json();
  },

  async getChats() {
    const res = await fetch(`${API_URL}/api/chats`, { headers: headers(), credentials: 'include' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to fetch chats');
    }
    return res.json();
  },

  async createChat(data: { name?: string; isGroup?: boolean; chatType?: 'direct' | 'group' | 'channel'; memberIds?: string[]; avatar?: string; description?: string }) {
    const res = await fetch(`${API_URL}/api/chats`, {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async createDirectChat(userId: string) {
    const res = await fetch(`${API_URL}/api/chats/direct`, {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
      body: JSON.stringify({ userId }),
    });
    return res.json();
  },

  async getMessages(chatId: string, before?: string) {
    const url = new URL(`${API_URL}/api/chats/${chatId}/messages`);
    if (before) url.searchParams.set('before', before);
    const res = await fetch(url.toString(), { headers: headers(), credentials: 'include' });
    return res.json();
  },

  async sendMessage(chatId: string, content: string, messageType = 'text', fileUrl?: string, fileName?: string, fileSize?: number, replyTo?: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
      body: JSON.stringify({ content, messageType, fileUrl, fileName, fileSize, replyTo }),
    });
    return res.json();
  },

  async deleteMessages(chatId: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      method: 'DELETE',
      credentials: 'include',
      headers: headers(),
    });
    return res.json();
  },

  async searchMessages(chatId: string, q: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/messages/search?q=${encodeURIComponent(q)}`, {
      credentials: 'include',
      headers: headers(),
    });
    return res.json();
  },

  async muteChat(chatId: string, muted: boolean) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/mute`, {
      method: 'PATCH',
      credentials: 'include',
      headers: headers(),
      body: JSON.stringify({ muted }),
    });
    return res.json();
  },

  async addReaction(messageId: string, emoji: string) {
    const res = await fetch(`${API_URL}/api/messages/${messageId}/reactions`, {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
      body: JSON.stringify({ emoji }),
    });
    return res.json();
  },

  async removeReaction(messageId: string, emoji: string) {
    const res = await fetch(`${API_URL}/api/messages/${messageId}/reactions`, {
      method: 'DELETE',
      credentials: 'include',
      headers: headers(),
      body: JSON.stringify({ emoji }),
    });
    return res.json();
  },

  async saveMessage(messageId: string) {
    const res = await fetch(`${API_URL}/api/messages/${messageId}/save`, {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
    });
    return res.json();
  },

  async unsaveMessage(messageId: string) {
    const res = await fetch(`${API_URL}/api/messages/${messageId}/save`, {
      method: 'DELETE',
      credentials: 'include',
      headers: headers(),
    });
    return res.json();
  },

  async deleteMessage(messageId: string) {
    const res = await fetch(`${API_URL}/api/messages/${messageId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: headers(),
    });
    return res.json();
  },

  async getSaves() {
    const res = await fetch(`${API_URL}/api/saves`, { headers: headers(), credentials: 'include' });
    return res.json();
  },

  async getTrash() {
    const res = await fetch(`${API_URL}/api/trash`, { headers: headers(), credentials: 'include' });
    return res.json();
  },

  async restoreMessage(messageId: string) {
    const res = await fetch(`${API_URL}/api/messages/${messageId}/restore`, {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
    });
    return res.json();
  },

  async permanentDeleteMessage(messageId: string) {
    const res = await fetch(`${API_URL}/api/messages/${messageId}/permanent`, {
      method: 'DELETE',
      credentials: 'include',
      headers: headers(),
    });
    return res.json();
  },

  async createInvite(chatId: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/invite`, {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
    });
    return res.json();
  },

  async joinInvite(code: string) {
    const res = await fetch(`${API_URL}/api/invites/${code}/join`, { headers: headers(), credentials: 'include' });
    return res.json();
  },

  async searchMessagesGlobal(q: string) {
    const res = await fetch(`${API_URL}/api/search/messages?q=${encodeURIComponent(q)}`, {
      credentials: 'include',
      headers: headers(),
    });
    return res.json();
  },

  async forwardMessage(messageId: string, chatId: string) {
    const res = await fetch(`${API_URL}/api/messages/${messageId}/forward`, {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
      body: JSON.stringify({ chatId }),
    });
    return res.json();
  },

  async pinMessage(chatId: string, messageId?: string | null) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/pin`, {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
      body: JSON.stringify({ messageId }),
    });
    return res.json();
  },

  async getMessageContext(messageId: string) {
    const res = await fetch(`${API_URL}/api/messages/${messageId}/context`, {
      credentials: 'include',
      headers: headers(),
    });
    return res.json();
  },

  async getChat(chatId: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}`, {
      credentials: 'include',
      headers: headers(),
    });
    return res.json();
  },

  async startCall(chatId: string, isVideo = false) {
    const res = await fetch(`${API_URL}/api/calls`, {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
      body: JSON.stringify({ chatId, isVideo }),
    });
    return res.json();
  },

  async endCall(callId: string) {
    const res = await fetch(`${API_URL}/api/calls/${callId}/end`, {
      method: 'PATCH',
      credentials: 'include',
      headers: headers(),
    });
    return res.json();
  },

  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      throw new Error('Upload failed');
    }
    return res.json();
  },

  async deleteMessageForMe(messageId: string) {
    const res = await fetch(`${API_URL}/api/messages/${messageId}/delete-for-me`, {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
    });
    return res.json();
  },

  async editMessage(messageId: string, content: string) {
    const res = await fetch(`${API_URL}/api/messages/${messageId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: headers(),
      body: JSON.stringify({ content }),
    });
    return res.json();
  },

  async markChatRead(chatId: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/read`, {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
    });
    return res.json();
  },

  async logout() {
    const res = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
    });
    return res.json();
  },
};
