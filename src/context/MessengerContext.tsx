import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
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
  file_url?: string;
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
  last_message: { id: string; content: string; created_at: string; sender_id: string; message_type?: string } | null;
}

interface CallStatus {
  isActive: boolean;
  chatId: string | null;
  participants: string[];
  isIncoming: boolean;
  callerId?: string;
  incomingOffer?: RTCSessionDescriptionInit;
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
  callStatus: CallStatus;
  setShowChatInfo: (show: boolean) => void;
  setActiveChat: (chat: Chat | null) => void;
  setActiveChatTab: (tab: ChatTab) => void;
  setSearchQuery: (query: string) => void;
  sendMessage: (content: string, type?: string, fileUrl?: string, fileName?: string, fileSize?: number) => Promise<void>;
  createDirectChat: (userId: string) => Promise<Chat>;
  createGroupChat: (name: string, memberIds: string[]) => Promise<Chat>;
  refreshChats: () => Promise<void>;
  getChatDisplayName: (chat: Chat) => string;
  getChatAvatar: (chat: Chat) => string | null;
  getOtherUser: (chat: Chat) => User | null;
  startCall: (chatId: string) => void;
  endCall: () => void;
  joinCall: () => void;
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
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string[]>>(new Map());
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>({ isActive: false, chatId: null, participants: [], isIncoming: false });

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const incomingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  const cleanupCall = useCallback(() => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    setCallStatus({ isActive: false, chatId: null, participants: [], isIncoming: false, incomingOffer: undefined });
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
        const { chatId, senderId, sdp } = message.payload as any;
        if (senderId !== user?.id) {
          incomingOfferRef.current = sdp;
          setCallStatus({
              isActive: true,
              chatId,
              participants: [senderId],
              isIncoming: true,
              callerId: senderId,
              incomingOffer: sdp
          });
        }
        break;
      }
      case 'call_answer': {
        const { sdp } = message.payload as any;
        if (peerConnection.current) {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
        }
        break;
      }
      case 'call_ice_candidate': {
        const { candidate } = message.payload as any;
        if (peerConnection.current && candidate) {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
        break;
      }
      case 'call_end': {
         cleanupCall();
         break;
      }
    }
  }, [user?.id, cleanupCall]);

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

  const sendMessage = async (content: string, type = 'text', fileUrl?: string, fileName?: string, fileSize?: number) => {
    if (!activeChat) return;
    try {
      await api.sendMessage(activeChat.id, content, type, fileUrl, fileName, fileSize);
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
              send({ type: 'call_ice_candidate', payload: { chatId, candidate: event.candidate } });
          }
      };

      pc.ontrack = (event) => {
          if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = event.streams[0];
          }
      };

      peerConnection.current = pc;
      return pc;
  };

  const startCall = async (chatId: string) => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStream.current = stream;

        const pc = setupPeerConnection(chatId);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        setCallStatus({ isActive: true, chatId, participants: [user!.id], isIncoming: false });
        send({ type: 'call_offer', payload: { chatId, sdp: offer } });
    } catch (e) {
        console.error('Failed to start call:', e);
    }
  };

  const joinCall = async () => {
    if (!callStatus.chatId || !incomingOfferRef.current) return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStream.current = stream;

        const pc = setupPeerConnection(callStatus.chatId);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferRef.current));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        setCallStatus(prev => ({ ...prev, isIncoming: false, participants: [...prev.participants, user!.id] }));
        send({ type: 'call_answer', payload: { chatId: callStatus.chatId, sdp: answer } });
    } catch (e) {
        console.error('Failed to join call:', e);
    }
  };

  const endCall = () => {
    if (callStatus.chatId) {
        send({ type: 'call_end', payload: { chatId: callStatus.chatId } });
    }
    cleanupCall();
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
      callStatus,
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
      startCall,
      endCall,
      joinCall,
    }}>
      <audio ref={remoteAudioRef} autoPlay />
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
