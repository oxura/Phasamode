import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useWebSocket, WSMessage } from '@/hooks/useWebSocket';

interface User {
  id: string;
  username: string;
  avatar: string | null;
  is_online: boolean;
  last_read_at?: string | null;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  created_at: string;
  edited_at?: string | null;
  updated_at?: string;
  reply_to?: string | null;
  reply?: { id: string; content: string; sender_id: string; sender_username: string } | null;
  sender?: User;
  reactions?: { emoji: string; user_id: string; username: string }[];
  is_saved?: boolean;
  chat_name?: string;
}

interface Chat {
  id: string;
  name: string | null;
  is_group: boolean;
  avatar: string | null;
  description: string | null;
  muted?: boolean;
  role?: string;
  members: User[];
  last_message: { id: string; content: string; created_at: string; sender_id: string; message_type?: string } | null;
}

interface CallStatus {
  isActive: boolean;
  chatId: string | null;
  participants: string[];
  isIncoming: boolean;
  isVideo?: boolean;
  callerId?: string;
  incomingOffer?: RTCSessionDescriptionInit;
}

type ChatTab = 'all' | 'groups' | 'contacts';
type MessengerView = 'home' | 'saves' | 'trash' | 'settings' | 'share';

interface MessengerContextType {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Message[];
  activeChatTab: ChatTab;
  activeView: MessengerView;
  searchQuery: string;
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  typingUsers: Map<string, string[]>;
  showChatInfo: boolean;
  saves: Message[];
  trash: Message[];
  callStatus: CallStatus;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  sendTyping: (chatId: string) => void;
  sendStopTyping: (chatId: string) => void;
  setShowChatInfo: (show: boolean) => void;
  setActiveChat: (chat: Chat | null) => void;
  setActiveChatTab: (tab: ChatTab) => void;
  setActiveView: (view: MessengerView) => void;
  setSearchQuery: (query: string) => void;
  sendMessage: (content: string, type?: string, fileUrl?: string, fileName?: string, fileSize?: number, replyTo?: string | null) => Promise<void>;
  createDirectChat: (userId: string) => Promise<Chat>;
  createGroupChat: (name: string, memberIds: string[]) => Promise<Chat>;
  refreshChats: () => Promise<void>;
  getChatDisplayName: (chat: Chat) => string;
  getChatAvatar: (chat: Chat) => string | null;
  getOtherUser: (chat: Chat) => User | null;
  startCall: (chatId: string, isVideo?: boolean) => void;
  endCall: () => void;
  joinCall: () => void;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  saveMessage: (messageId: string) => Promise<void>;
  unsaveMessage: (messageId: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  deleteMessageForMe: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  muteChat: (chatId: string, muted: boolean) => Promise<void>;
  deleteMessages: (chatId: string) => Promise<void>;
  searchMessages: (chatId: string, q: string) => Promise<void>;
  createInvite: (chatId: string) => Promise<{ code: string }>;
  fetchSaves: () => Promise<void>;
  fetchTrash: () => Promise<void>;
  restoreMessage: (messageId: string) => Promise<void>;
  permanentDeleteMessage: (messageId: string) => Promise<void>;
  joinInvite: (code: string) => Promise<void>;
}

const MessengerContext = createContext<MessengerContextType | undefined>(undefined);

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

export const MessengerProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChatTab, setActiveChatTab] = useState<ChatTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [activeView, setActiveView] = useState<MessengerView>('home');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string[]>>(new Map());
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [saves, setSaves] = useState<Message[]>([]);
  const [trash, setTrash] = useState<Message[]>([]);
  const [callStatus, setCallStatus] = useState<CallStatus>({ isActive: false, chatId: null, participants: [], isIncoming: false, isVideo: false });
  const [localStreamState, setLocalStreamState] = useState<MediaStream | null>(null);
  const [remoteStreamState, setRemoteStreamState] = useState<MediaStream | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const incomingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const activeChatIdRef = useRef<string | null>(null);
  const loadingChatIdRef = useRef<string | null>(null);
  const loadedChatIdRef = useRef<string | null>(null);
  const messagesLengthRef = useRef<number>(0);

  useEffect(() => {
    activeChatIdRef.current = activeChat?.id ?? null;
  }, [activeChat?.id]);

  useEffect(() => {
    messagesLengthRef.current = messages.length;
  }, [messages.length]);

  const cleanupCall = useCallback(() => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setCallStatus({ isActive: false, chatId: null, participants: [], isIncoming: false, incomingOffer: undefined, isVideo: false });
    setLocalStreamState(null);
    setRemoteStreamState(null);
    incomingOfferRef.current = null;
  }, []);

  const handleWSMessage = useCallback(async (message: WSMessage) => {
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
                message_type: newMsg.message_type,
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
        if (activeChat) {
          setActiveChat(prev => prev ? {
            ...prev,
            members: prev.members.map(m => m.id === userId ? { ...m, is_online: isOnline } : m),
          } : prev);
        }
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
      case 'call_offer': {
        const { chatId, senderId, sdp, isVideo } = message.payload as { chatId: string; senderId: string; sdp: RTCSessionDescriptionInit; isVideo?: boolean };
        if (senderId !== user?.id) {
          incomingOfferRef.current = sdp;
          setCallStatus({
            isActive: true,
            chatId,
            participants: [senderId],
            isIncoming: true,
            callerId: senderId,
            incomingOffer: sdp,
            isVideo: !!isVideo
          });
        }
        break;
      }
      case 'call_answer': {
        const { sdp } = message.payload as { sdp: RTCSessionDescriptionInit };
        if (peerConnection.current) {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
        }
        break;
      }
      case 'call_ice_candidate': {
        const { candidate } = message.payload as { candidate: RTCIceCandidateInit };
        if (peerConnection.current && candidate) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
        break;
      }
      case 'call_end': {
        cleanupCall();
        break;
      }
      case 'reaction_added': {
        const { messageId, userId, username, emoji, chatId } = message.payload as { messageId: string; userId: string; username: string; emoji: string; chatId: string };
        if (activeChat?.id === chatId) {
          setMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? { ...msg, reactions: [...(msg.reactions || []), { emoji, user_id: userId, username }] }
              : msg
          ));
        }
        break;
      }
      case 'reaction_removed': {
        const { messageId, userId, emoji, chatId } = message.payload as { messageId: string; userId: string; emoji: string; chatId: string };
        if (activeChat?.id === chatId) {
          setMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? { ...msg, reactions: (msg.reactions || []).filter(r => !(r.emoji === emoji && r.user_id === userId)) }
              : msg
          ));
        }
        break;
      }
      case 'message_deleted': {
        const { messageId, chatId } = message.payload as { messageId: string; chatId: string };
        if (activeChat?.id === chatId) {
          setMessages(prev => prev.filter(m => m.id !== messageId));
        }
        break;
      }
      case 'message_edited': {
        const { id, chatId, content, edited_at } = message.payload as { id: string; chatId: string; content: string; edited_at?: string };
        if (!id || !chatId) break;
        if (activeChat?.id === chatId) {
          setMessages(prev => prev.map(m => m.id === id ? { ...m, content, edited_at: edited_at || m.edited_at } : m));
        }
        setChats(prev => prev.map(chat => {
          if (chat.id === chatId && chat.last_message?.id === id) {
            return {
              ...chat,
              last_message: {
                ...chat.last_message,
                content,
              },
            };
          }
          return chat;
        }));
        break;
      }
      case 'read_receipt': {
        const { chatId, userId, lastReadAt } = message.payload as { chatId: string; userId: string; lastReadAt: string };
        if (!chatId || !userId) break;
        setChats(prev => prev.map(chat => (
          chat.id === chatId
            ? {
              ...chat,
              members: chat.members.map(m => m.id === userId ? { ...m, last_read_at: lastReadAt } : m),
            }
            : chat
        )));
        if (activeChat?.id === chatId) {
          setActiveChat(prev => prev ? {
            ...prev,
            members: prev.members.map(m => m.id === userId ? { ...m, last_read_at: lastReadAt } : m),
          } : prev);
        }
        break;
      }
      case 'history_cleared': {
        const { chatId } = message.payload as { chatId: string };
        if (activeChat?.id === chatId) {
          setMessages([]);
        }
        break;
      }
    }
  }, [activeChat?.id, user?.id, cleanupCall]);

  const { send } = useWebSocket(handleWSMessage);

  const sendTyping = useCallback((chatId: string) => {
    send('typing', { chatId });
  }, [send]);

  const sendStopTyping = useCallback((chatId: string) => {
    send('stop_typing', { chatId });
  }, [send]);

  const refreshChats = useCallback(async () => {
    if (!user) return;
    setIsLoadingChats(true);
    try {
      const data = await api.getChats();
      if (Array.isArray(data)) {
        setChats(data);
        const currentId = activeChatIdRef.current;
        if (currentId) {
          const updatedActive = data.find((c) => c.id === currentId);
          if (updatedActive) {
            setActiveChat(updatedActive);
          }
        }
      } else {
        console.error('Invalid chats data received:', data);
        setChats([]);
      }
    } catch (e) {
      console.error('Failed to load chats:', e);
      setChats([]);
    } finally {
      setIsLoadingChats(false);
    }
  }, [user]);

  useEffect(() => {
    refreshChats();
  }, [refreshChats]);

  const markChatRead = useCallback(async (chatId: string) => {
    if (!user?.id) return;
    try {
      const result = await api.markChatRead(chatId);
      const lastReadAt = result?.lastReadAt;
      if (!lastReadAt) return;
      setChats(prev => prev.map(chat => (
        chat.id === chatId
          ? { ...chat, members: chat.members.map(m => m.id === user.id ? { ...m, last_read_at: lastReadAt } : m) }
          : chat
      )));
      if (activeChatIdRef.current === chatId) {
        setActiveChat(prev => prev ? {
          ...prev,
          members: prev.members.map(m => m.id === user.id ? { ...m, last_read_at: lastReadAt } : m),
        } : prev);
      }
    } catch (e) {
      console.error('Failed to mark chat read:', e);
    }
  }, [user?.id]);

  useEffect(() => {
    const chatId = activeChat?.id;
    if (!chatId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      if (loadingChatIdRef.current === chatId) return;
      if (loadedChatIdRef.current === chatId && messagesLengthRef.current > 0) return;
      loadingChatIdRef.current = chatId;
      setIsLoadingMessages(true);
      try {
        const data = await api.getMessages(chatId);
        setMessages(data);
        loadedChatIdRef.current = chatId;
        if (data && data.length > 0) {
          markChatRead(chatId);
        }
      } catch (e) {
        console.error('Failed to load messages:', e);
      } finally {
        setIsLoadingMessages(false);
        if (loadingChatIdRef.current === chatId) {
          loadingChatIdRef.current = null;
        }
      }
    };

    loadMessages();
  }, [activeChat?.id, markChatRead]);

  useEffect(() => {
    if (!activeChat || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (!last) return;
    if (last.sender_id !== user?.id) {
      markChatRead(activeChat.id);
    }
  }, [messages.length, activeChat?.id, user?.id, markChatRead]);

  const sendMessage = async (content: string, type = 'text', fileUrl?: string, fileName?: string, fileSize?: number, replyTo?: string | null) => {
    if (!activeChat) return;
    try {
      await api.sendMessage(activeChat.id, content, type, fileUrl, fileName, fileSize, replyTo || undefined);
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  const createDirectChat = async (userId: string) => {
    const chat = await createDirectChatApi(userId);
    setChats(prev => {
      if (prev.some(c => c.id === chat.id)) return prev;
      return [chat, ...prev];
    });
    return chat;
  };

  const createDirectChatApi = async (userId: string) => {
    return await api.createDirectChat(userId);
  }

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

  const setupPeerConnection = (chatId: string) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        send('call_ice_candidate', { chatId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreamState(event.streams[0]);
    };

    peerConnection.current = pc;
    return pc;
  };

  const startCall = async (chatId: string, isVideo = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
      localStream.current = stream;
      setLocalStreamState(stream);

      const pc = setupPeerConnection(chatId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      setCallStatus({ isActive: true, chatId, participants: [user!.id], isIncoming: false, isVideo });
      send('call_offer', { chatId, sdp: offer, isVideo });
    } catch (e) {
      console.error('Failed to start call:', e);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    try {
      await api.addReaction(messageId, emoji);
      // Feedback: optimistic update or wait for WS
    } catch (e) {
      console.error('Failed to add reaction:', e);
    }
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    try {
      await api.removeReaction(messageId, emoji);
    } catch (e) {
      console.error('Failed to remove reaction:', e);
    }
  };

  const saveMessage = async (messageId: string) => {
    try {
      await api.saveMessage(messageId);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_saved: true } : m));
    } catch (e) {
      console.error('Failed to save message:', e);
    }
  };

  const unsaveMessage = async (messageId: string) => {
    try {
      await api.unsaveMessage(messageId);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_saved: false } : m));
    } catch (e) {
      console.error('Failed to unsave message:', e);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await api.deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      refreshChats();
      fetchTrash();
    } catch (e) {
      console.error('Failed to delete message:', e);
    }
  };

  const deleteMessageForMe = async (messageId: string) => {
    try {
      await api.deleteMessageForMe(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      refreshChats();
    } catch (e) {
      console.error('Failed to delete message for me:', e);
    }
  };

  const editMessage = async (messageId: string, content: string) => {
    try {
      const updated = await api.editMessage(messageId, content);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: updated.content ?? content, edited_at: updated.edited_at ?? m.edited_at } : m));
      refreshChats();
    } catch (e) {
      console.error('Failed to edit message:', e);
      throw e;
    }
  };

  const muteChat = async (chatId: string, muted: boolean) => {
    try {
      await api.muteChat(chatId, muted);
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, muted } : c));
      if (activeChat?.id === chatId) {
        setActiveChat(prev => prev ? { ...prev, muted } : null);
      }
    } catch (e) {
      console.error('Failed to mute chat:', e);
    }
  };

  const deleteMessages = async (chatId: string) => {
    try {
      await api.deleteMessages(chatId);
      if (activeChat?.id === chatId) {
        setMessages([]);
      }
    } catch (e: unknown) {
      console.error('Failed to delete messages:', e);
      const message = e instanceof Error ? e.message : '';
      if (message) {
        toast.error(message);
      } else {
        toast.error('Failed to clear history');
      }
    }
  };

  const searchMessages = async (chatId: string, q: string) => {
    try {
      const results = await api.searchMessages(chatId, q);
      setMessages(results);
    } catch (e) {
      console.error('Search failed:', e);
    }
  };

  const createInvite = async (chatId: string) => {
    return await api.createInvite(chatId);
  };

  const fetchSaves = useCallback(async () => {
    try {
      const data = await api.getSaves();
      setSaves(data);
    } catch (e) {
      console.error('Failed to fetch saves:', e);
    }
  }, []);

  const fetchTrash = useCallback(async () => {
    try {
      const data = await api.getTrash();
      setTrash(data);
    } catch (e) {
      console.error('Failed to fetch trash:', e);
    }
  }, []);

  const restoreMessage = useCallback(async (messageId: string) => {
    try {
      await api.restoreMessage(messageId);
      setTrash(prev => prev.filter(m => m.id !== messageId));
      refreshChats(); // Might affect last message
    } catch (e) {
      console.error('Failed to restore message:', e);
    }
  }, [refreshChats]);

  const permanentDeleteMessage = useCallback(async (messageId: string) => {
    try {
      await api.permanentDeleteMessage(messageId);
      setTrash(prev => prev.filter(m => m.id !== messageId));
    } catch (e) {
      console.error('Failed to permanently delete message:', e);
    }
  }, []);

  const joinInvite = useCallback(async (code: string) => {
    try {
      await api.joinInvite(code);
      await refreshChats();
    } catch (e) {
      console.error('Failed to join invite:', e);
      throw e;
    }
  }, [refreshChats]);

  const joinCall = async () => {
    if (!callStatus.chatId || !incomingOfferRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callStatus.isVideo });
      localStream.current = stream;
      setLocalStreamState(stream);

      const pc = setupPeerConnection(callStatus.chatId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferRef.current));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      setCallStatus(prev => ({ ...prev, isIncoming: false, participants: [...prev.participants, user!.id] }));
      send('call_answer', { chatId: callStatus.chatId, sdp: answer });
    } catch (e) {
      console.error('Failed to join call:', e);
    }
  };

  const endCall = () => {
    if (callStatus.chatId) {
      send('call_end', { chatId: callStatus.chatId });
    }
    cleanupCall();
  };

  return (
    <MessengerContext.Provider value={{
      chats,
      activeChat,
      messages,
      activeChatTab,
      activeView,
      searchQuery,
      isLoadingChats,
      isLoadingMessages,
      typingUsers,
      showChatInfo,
      callStatus,
      localStream: localStreamState,
      remoteStream: remoteStreamState,
      sendTyping,
      sendStopTyping,
      setShowChatInfo,
      setActiveChat,
      setActiveChatTab,
      setActiveView,
      setSearchQuery,
      sendMessage,
      createDirectChat,
      createGroupChat,
      refreshChats,
      getChatDisplayName,
      getChatAvatar,
      getOtherUser,
      startCall,
      endCall,
      joinCall,
      addReaction,
      removeReaction,
      saveMessage,
      unsaveMessage,
      deleteMessage,
      deleteMessageForMe,
      editMessage,
      muteChat,
      deleteMessages,
      searchMessages,
      createInvite,
      fetchSaves,
      fetchTrash,
      restoreMessage,
      permanentDeleteMessage,
      joinInvite,
      saves,
      trash,
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
