const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getToken = () => localStorage.getItem('token');

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

export const api = {
  async register(email: string, username: string, password: string) {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Registration failed');
    }
    return res.json();
  },

  async login(email: string, password: string) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${API_URL}/api/auth/me`, { headers: headers() });
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  },

  async updateProfile(data: { username?: string; avatar?: string }) {
    const res = await fetch(`${API_URL}/api/users/profile`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async searchUsers(query: string) {
    const res = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
      headers: headers(),
    });
    return res.json();
  },

  async getChats() {
    const res = await fetch(`${API_URL}/api/chats`, { headers: headers() });
    return res.json();
  },

  async createChat(data: { name?: string; isGroup?: boolean; memberIds?: string[]; avatar?: string; description?: string }) {
    const res = await fetch(`${API_URL}/api/chats`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async createDirectChat(userId: string) {
    const res = await fetch(`${API_URL}/api/chats/direct`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ userId }),
    });
    return res.json();
  },

  async getMessages(chatId: string, before?: string) {
    const url = new URL(`${API_URL}/api/chats/${chatId}/messages`);
    if (before) url.searchParams.set('before', before);
    const res = await fetch(url.toString(), { headers: headers() });
    return res.json();
  },

  async sendMessage(chatId: string, content: string, messageType = 'text', fileUrl?: string, fileName?: string, fileSize?: number) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ content, messageType, fileUrl, fileName, fileSize }),
    });
    return res.json();
  },

  async deleteMessages(chatId: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      method: 'DELETE',
      headers: headers(),
    });
    return res.json();
  },

  async searchMessages(chatId: string, q: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/messages/search?q=${encodeURIComponent(q)}`, {
      headers: headers(),
    });
    return res.json();
  },

  async muteChat(chatId: string, muted: boolean) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/mute`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ muted }),
    });
    return res.json();
  },

  async addReaction(messageId: string, emoji: string) {
    const res = await fetch(`${API_URL}/api/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ emoji }),
    });
    return res.json();
  },

  async removeReaction(messageId: string, emoji: string) {
    const res = await fetch(`${API_URL}/api/messages/${messageId}/reactions`, {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify({ emoji }),
    });
    return res.json();
  },

  async saveMessage(messageId: string) {
    const res = await fetch(`${API_URL}/api/messages/${messageId}/save`, {
      method: 'POST',
      headers: headers(),
    });
    return res.json();
  },

  async unsaveMessage(messageId: string) {
    const res = await fetch(`${API_URL}/api/messages/${messageId}/save`, {
      method: 'DELETE',
      headers: headers(),
    });
    return res.json();
  },

  async getSaves() {
    const res = await fetch(`${API_URL}/api/saves`, { headers: headers() });
    return res.json();
  },

  async getTrash() {
    const res = await fetch(`${API_URL}/api/trash`, { headers: headers() });
    return res.json();
  },

  async restoreMessage(messageId: string) {
    const res = await fetch(`${API_URL}/api/messages/${messageId}/restore`, {
      method: 'POST',
      headers: headers(),
    });
    return res.json();
  },

  async permanentDeleteMessage(messageId: string) {
    const res = await fetch(`${API_URL}/api/messages/${messageId}/permanent`, {
      method: 'DELETE',
      headers: headers(),
    });
    return res.json();
  },

  async createInvite(chatId: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/invite`, {
      method: 'POST',
      headers: headers(),
    });
    return res.json();
  },

  async joinInvite(code: string) {
    const res = await fetch(`${API_URL}/api/invites/${code}/join`, { headers: headers() });
    return res.json();
  },

  async startCall(chatId: string, isVideo = false) {
    const res = await fetch(`${API_URL}/api/calls`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ chatId, isVideo }),
    });
    return res.json();
  },

  async endCall(callId: string) {
    const res = await fetch(`${API_URL}/api/calls/${callId}/end`, {
      method: 'PATCH',
      headers: headers(),
    });
    return res.json();
  },

  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
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
};
