import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '@/lib/api';
import { useWebSocket, WSMessage } from '@/hooks/useWebSocket';

interface User {
  id: string;
  username: string;
  avatar: string | null;
  is_online: boolean;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender?: User;
}

interface Chat {
  id: string;
  name: string | null;
  is_group: boolean;
  avatar: string | null;
  description: string | null;
  members: User[];
  last_message: { id: string; content: string; created_at: string; sender_id: string } | null;
}

type ChatTab = 'all' | 'groups' | 'contacts';

interface MessengerContextType {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Message[];
  activeChatTab: ChatTab;
  searchQuery: string;
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  typingUsers: Map<string, string[]>;
  showChatInfo: boolean;
  setShowChatInfo: (show: boolean) => void;
  setActiveChat: (chat: Chat | null) => void;
  setActiveChatTab: (tab: ChatTab) => void;
  setSearchQuery: (query: string) => void;
  sendMessage: (content: string) => Promise<void>;
  createDirectChat: (userId: string) => Promise<Chat>;
  createGroupChat: (name: string, memberIds: string[]) => Promise<Chat>;
  refreshChats: () => Promise<void>;
  getChatDisplayName: (chat: Chat) => string;
  getChatAvatar: (chat: Chat) => string | null;
  getOtherUser: (chat: Chat) => User | null;
}

const MessengerContext = createContext<MessengerContextType | undefined>(undefined);

export const MessengerProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChatTab, setActiveChatTab] = useState<ChatTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string[]>>(new Map());
  const [showChatInfo, setShowChatInfo] = useState(false);

    const handleWSMessage = useCallback((message: WSMessage) => {
      if (!message || !message.type) return;

      switch (message.type) {
        case 'new_message': {
          const newMsg = message.payload as Message;
          if (!newMsg?.id) break;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setChats(prev => prev.map(chat => {
            if (chat.id === newMsg.chat_id) {
              return {
                ...chat,
                last_message: {
                  id: newMsg.id,
                  content: newMsg.content,
                  created_at: newMsg.created_at,
                  sender_id: newMsg.sender_id,
                },
              };
            }
            return chat;
          }));
          break;
        }
        case 'user_status': {
          const { userId, isOnline } = (message.payload as { userId?: string; isOnline?: boolean }) || {};
          if (!userId || typeof isOnline === 'undefined') break;
          setChats(prev => prev.map(chat => ({
            ...chat,
            members: chat.members.map(m => m.id === userId ? { ...m, is_online: isOnline } : m),
          })));
          break;
        }
        case 'typing': {
          const { chatId, userId } = (message.payload as { chatId?: string; userId?: string }) || {};
          if (!chatId || !userId) break;
          setTypingUsers(prev => {
            const updated = new Map(prev);
            const users = updated.get(chatId) || [];
            if (!users.includes(userId)) {
              updated.set(chatId, [...users, userId]);
            }
            return updated;
          });
          break;
        }
        case 'stop_typing': {
          const { chatId, userId } = (message.payload as { chatId?: string; userId?: string }) || {};
          if (!chatId || !userId) break;
          setTypingUsers(prev => {
            const updated = new Map(prev);
            const users = updated.get(chatId) || [];
            updated.set(chatId, users.filter(id => id !== userId));
            return updated;
          });
          break;
        }
      }
    }, []);


  const { send } = useWebSocket(handleWSMessage);

  const refreshChats = useCallback(async () => {
    if (!user) return;
    setIsLoadingChats(true);
    try {
      const data = await api.getChats();
      setChats(data);
    } catch (e) {
      console.error('Failed to load chats:', e);
    } finally {
      setIsLoadingChats(false);
    }
  }, [user]);

  useEffect(() => {
    refreshChats();
  }, [refreshChats]);

  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const data = await api.getMessages(activeChat.id);
        setMessages(data);
      } catch (e) {
        console.error('Failed to load messages:', e);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [activeChat?.id]);

  const sendMessage = async (content: string) => {
    if (!activeChat || !content.trim()) return;
    
    try {
      await api.sendMessage(activeChat.id, content);
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  const createDirectChat = async (userId: string) => {
    const chat = await api.createDirectChat(userId);
    setChats(prev => {
      if (prev.some(c => c.id === chat.id)) return prev;
      return [chat, ...prev];
    });
    return chat;
  };

  const createGroupChat = async (name: string, memberIds: string[]) => {
    const chat = await api.createChat({ name, isGroup: true, memberIds });
    setChats(prev => [chat, ...prev]);
    return chat;
  };

  const getOtherUser = (chat: Chat): User | null => {
    if (chat.is_group || !user) return null;
    return chat.members.find(m => m.id !== user.id) || null;
  };

  const getChatDisplayName = (chat: Chat): string => {
    if (chat.is_group) return chat.name || 'Group Chat';
    const other = getOtherUser(chat);
    return other?.username || 'Unknown';
  };

  const getChatAvatar = (chat: Chat): string | null => {
    if (chat.is_group) return chat.avatar;
    const other = getOtherUser(chat);
    return other?.avatar || null;
  };

  return (
    <MessengerContext.Provider value={{
      chats,
      activeChat,
      messages,
      activeChatTab,
      searchQuery,
      isLoadingChats,
      isLoadingMessages,
      typingUsers,
      showChatInfo,
      setShowChatInfo,
      setActiveChat,
      setActiveChatTab,
      setSearchQuery,
      sendMessage,
      createDirectChat,
      createGroupChat,
      refreshChats,
      getChatDisplayName,
      getChatAvatar,
      getOtherUser,
    }}>
      {children}
    </MessengerContext.Provider>
  );
};

export const useMessenger = () => {
  const context = useContext(MessengerContext);
  if (!context) {
    throw new Error('useMessenger must be used within MessengerProvider');
  }
  return context;
};
