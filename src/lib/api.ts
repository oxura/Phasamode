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

  async sendMessage(chatId: string, content: string, messageType = 'text') {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ content, messageType }),
    });
    return res.json();
  },

  async addChatMember(chatId: string, userId: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/members`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ userId }),
    });
    return res.json();
  },
};
