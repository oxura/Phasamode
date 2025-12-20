import { Phone, Video, MoreHorizontal, Smile, Paperclip, Send, Mic, Pause, Play, AtSign, Loader2, Copy, Square, Trash2, Pencil, X, Bookmark, CornerUpLeft, ArrowLeft, Check, CheckCheck, Forward } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useMessenger } from '@/context/MessengerContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { AvatarImage } from '@/components/AvatarImage';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    message_type: string;
    edited_at?: string | null;
    reply_to?: string | null;
    reply?: { id: string; content: string; sender_id: string; sender_username: string } | null;
    forwarded_from?: { message_id: string; chat_id: string; chat_name: string | null; sender_id: string; sender_username: string | null } | null;
    sender?: { id: string; username: string; avatar: string | null };
    reactions?: { emoji: string; user_id: string; username: string }[];
    is_saved?: boolean;
    file_url?: string;
    file_name?: string;
  };
  isOwn: boolean;
  canDeleteForAll: boolean;
  readStatus?: string | null;
  isPinned?: boolean;
  onEdit: (messageId: string, content: string) => void;
  onDeleteForMe: (messageId: string) => void;
  onDeleteForAll: (messageId: string) => void;
  onReply: (messageId: string, content: string, senderName: string) => void;
  onForward: (messageId: string) => void;
  onTogglePin: (messageId: string, isPinned: boolean) => void;
}

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const AudioMessage = ({ src }: { src: string }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const handleLoaded = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-3 min-w-[240px] bg-white/5 p-3 rounded-xl border border-white/5">
      <button
        onClick={togglePlayback}
        className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30 transition-colors"
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${progress}%` }} />
      </div>
      <span className="text-[10px] text-white/50 min-w-[32px] text-right">{formatDuration(duration)}</span>
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
};

const MessageBubble = ({ message, isOwn, canDeleteForAll, readStatus, isPinned, onEdit, onDeleteForMe, onDeleteForAll, onReply, onForward, onTogglePin }: MessageBubbleProps) => {
  const { addReaction, removeReaction, saveMessage, unsaveMessage } = useMessenger();
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const senderName = message.sender?.username || 'Unknown';
  const senderAvatar = message.sender?.avatar;

  const { user } = useAuth();
  const handleReactionClick = (emoji: string) => {
    const hasReacted = message.reactions?.some(r => r.emoji === emoji && r.user_id === user?.id);
    if (hasReacted) removeReaction(message.id, emoji);
    else addReaction(message.id, emoji);
  };

  const renderContent = () => {
    if (message.message_type === 'image') {
      return (
        <div className="rounded-xl overflow-hidden max-w-[320px] cursor-pointer ring-1 ring-white/10" onClick={() => window.open(message.content, '_blank')}>
          <img src={message.content} alt="Shared image" className="w-full h-auto object-cover" />
        </div>
      );
    }
    if (message.message_type === 'file') {
      const fileName = message.file_name || message.content.split('/').pop() || 'File';
      return (
        <div className="flex items-center gap-3 p-2 min-w-[200px] cursor-pointer group/file" onClick={() => window.open(message.file_url || message.content, '_blank')}>
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 group-hover/file:bg-primary/20 transition-colors">
            <Paperclip size={18} className="text-white" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[13px] font-semibold truncate text-white">
              {fileName}
            </span>
            <span className="text-[10px] text-white/50 uppercase tracking-wider font-bold">Download</span>
          </div>
        </div>
      );
    }
    if (message.message_type === 'video') {
      const src = message.file_url || message.content;
      return (
        <div className="rounded-xl overflow-hidden max-w-[360px] ring-1 ring-white/10">
          <video src={src} controls className="w-full h-auto" />
        </div>
      );
    }
    if (message.message_type === 'audio') {
      return <AudioMessage src={message.file_url || message.content} />;
    }
    return <p className="text-[13px] leading-snug whitespace-pre-wrap break-words max-w-full overflow-hidden">{message.content}</p>;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content || '');
    toast.success('Message copied');
  };

  const handleSaveToggle = () => {
    if (message.is_saved) unsaveMessage(message.id);
    else saveMessage(message.id);
  };

  const handleDeleteForMe = () => {
    onDeleteForMe(message.id);
  };

  const handleDeleteForAll = () => {
    onDeleteForAll(message.id);
  };

  const isEditable = isOwn && message.message_type === 'text';

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          id={`message-${message.id}`}
          className={cn(
            'flex mb-3 group/message',
            isOwn ? 'justify-end' : 'justify-start'
          )}
        >
          <div className={cn(
            'flex gap-3 max-w-full',
            isOwn ? 'flex-row-reverse items-end' : 'flex-row items-end'
          )}>
            {!isOwn && (
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/10 mt-auto">
                <AvatarImage
                  src={senderAvatar}
                  alt={senderName}
                  className="w-full h-full"
                  fallback={(
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">{senderName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                />
              </div>
            )}
            <div className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
              <div className={cn(
                'flex items-center gap-2 mb-1 px-1',
                isOwn ? 'justify-end' : 'justify-start'
              )}>
                {!isOwn && <span className="text-[11px] font-bold text-white/80">{senderName}</span>}
                <span className="text-[10px] text-white/30">{time}</span>
                {message.edited_at && <span className="text-[10px] text-white/30">edited</span>}
              </div>

              <div className={cn(
                'message-bubble',
                isOwn ? 'message-bubble-mine' : 'message-bubble-other',
                message.message_type === 'image' && 'p-1 bg-transparent border-none'
              )}>
                {message.forwarded_from && (
                  <div className="mb-2 text-[10px] text-white/50 uppercase tracking-[0.15em]">
                    Forwarded from {message.forwarded_from.sender_username || 'Unknown'}
                  </div>
                )}
                {message.reply && (
                  <div className="mb-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                    <div className="text-[10px] text-white/50">
                      Replying to {message.reply.sender_username}
                    </div>
                    <div className="text-[12px] text-white/70 truncate">
                      {message.reply.content}
                    </div>
                  </div>
                )}
                {renderContent()}

                {message.reactions && message.reactions.length > 0 && (
                  <div className={cn(
                    'absolute -bottom-4 flex flex-wrap gap-1',
                    isOwn ? 'right-0' : 'left-0'
                  )}>
                    {Object.entries(
                      message.reactions.reduce((acc, r) => {
                        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([emoji, count]) => (
                      <button
                        key={emoji}
                        onClick={() => handleReactionClick(emoji)}
                        className="flex items-center gap-1 bg-[#1a1a24] border border-white/10 rounded-full px-2 py-0.5 hover:bg-white/10 transition-colors shadow-lg"
                      >
                        <span className="text-xs">{emoji}</span>
                        <span className="text-[10px] font-bold text-white/70">{count}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className={cn(
                  'absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/message:opacity-100 transition-all duration-200 flex gap-2',
                  isOwn ? '-left-40 flex-row-reverse' : '-right-40'
                )}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-white/50">
                        <Smile size={14} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 bg-black/90 border-white/10 backdrop-blur-xl p-2" side="top">
                      <div className="flex gap-1 overflow-x-auto no-scrollbar">
                        {QUICK_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleReactionClick(emoji)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded transition-colors flex-shrink-0"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <button
                    onClick={() => onReply(message.id, message.content, senderName)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-white/50"
                  >
                    <CornerUpLeft size={14} />
                  </button>
                  <button
                    onClick={handleSaveToggle}
                    className={cn(
                      'p-1.5 rounded-lg border border-white/5 transition-all',
                      message.is_saved ? 'bg-primary/20 text-primary' : 'bg-white/5 hover:bg-white/10 text-white/50'
                    )}
                  >
                    <Bookmark size={14} />
                  </button>
                </div>
              </div>
              {isOwn && readStatus && (
                <div className="flex items-center justify-end gap-1 px-1 mt-1 text-[10px] text-white/30">
                  {readStatus === 'Sent' && <Check size={12} className="text-white/40" />}
                  {readStatus === 'Delivered' && <CheckCheck size={12} className="text-white/40" />}
                  {readStatus === 'Read' && <CheckCheck size={12} className="text-primary" />}
                  <span>{readStatus}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="bg-[#1a1a24] border-white/10 backdrop-blur-xl">
        <ContextMenuItem onClick={handleCopy} className="cursor-pointer text-white/80">
          <Copy size={14} className="mr-2" />
          Copy
        </ContextMenuItem>
        <ContextMenuItem onClick={handleSaveToggle} className="cursor-pointer text-white/80">
          <Bookmark size={14} className="mr-2" />
          {message.is_saved ? 'Unsave' : 'Save'}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onForward(message.id)} className="cursor-pointer text-white/80">
          <Forward size={14} className="mr-2" />
          Forward
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onTogglePin(message.id, !!isPinned)} className="cursor-pointer text-white/80">
          <Bookmark size={14} className="mr-2" />
          {isPinned ? 'Unpin' : 'Pin'}
        </ContextMenuItem>
        {isEditable && (
          <ContextMenuItem
            onClick={() => onEdit(message.id, message.content)}
            className="cursor-pointer text-white/80"
          >
            <Pencil size={14} className="mr-2" />
            Edit
          </ContextMenuItem>
        )}
        <ContextMenuSeparator className="bg-white/10" />
        <ContextMenuItem onClick={handleDeleteForMe} className="cursor-pointer text-white/80">
          <Trash2 size={14} className="mr-2" />
          Delete for me
        </ContextMenuItem>
        {(isOwn || canDeleteForAll) && (
          <ContextMenuItem onClick={handleDeleteForAll} className="cursor-pointer text-red-400">
            <Trash2 size={14} className="mr-2" />
            Delete for everyone
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

const QUICK_EMOJIS = [
  '\u{1F44D}',
  '\u{2764}\u{FE0F}',
  '\u{1F602}',
  '\u{1F62E}',
  '\u{1F622}',
  '\u{1F525}',
  '\u{1F921}',
  '\u{1F595}',
  '\u{1F621}',
  '\u{1F44F}',
  '\u{1F389}',
  '\u{1F64F}',
];

const PICKER_EMOJIS = [
  '\u{1F600}', '\u{1F603}', '\u{1F604}', '\u{1F601}', '\u{1F605}', '\u{1F602}',
  '\u{1F923}', '\u{1F60A}', '\u{1F60D}', '\u{1F618}', '\u{1F60E}', '\u{1F622}',
  '\u{1F62D}', '\u{1F621}', '\u{1F44D}', '\u{1F44E}', '\u{1F64F}', '\u{1F525}',
  '\u{1F389}', '\u{1F4AF}', '\u{2728}', '\u{1F91D}', '\u{1F680}', '\u{1F4A5}',
  '\u{1F92A}', '\u{1F631}', '\u{1F920}', '\u{1F921}', '\u{1F595}', '\u{1F3AF}',
  '\u{1F355}', '\u{1F37A}', '\u{1F47D}', '\u{1F9E0}', '\u{1F9E1}', '\u{1F970}',
  '\u{1F47B}', '\u{1F480}', '\u{1F4A3}', '\u{1F9A0}', '\u{1F331}', '\u{1F38A}',
];

export const ChatArea = () => {
  const { user } = useAuth();
  const {
    activeChat,
    chats,
    messages,
    isLoadingMessages,
    sendMessage,
    forwardMessage,
    pinMessage,
    openMessageContext,
    getChatDisplayName,
    getChatAvatar,
    getOtherUser,
    typingUsers,
    callStatus,
    localStream,
    remoteStream,
    sendTyping,
    sendStopTyping,
    startCall,
    endCall,
    joinCall,
    muteChat,
    deleteMessages,
    createInvite,
    showChatInfo,
    setShowChatInfo,
    deleteMessage,
    deleteMessageForMe,
    editMessage,
    setActiveChat,
  } = useMessenger();
  const isMobile = useIsMobile();

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; senderName: string } | null>(null);
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [forwardQuery, setForwardQuery] = useState('');
  const [forwardMessageId, setForwardMessageId] = useState<string | null>(null);
  const [isForwarding, setIsForwarding] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const typingTimeoutRef = useRef<number | null>(null);
  const lastTypingRef = useRef<number>(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    setEditingMessage(null);
    setMessageText('');
    setReplyTo(null);
  }, [activeChat?.id]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleSend = async () => {
    if (!messageText.trim() || isSending) return;
    if (activeChat?.chat_type === 'channel' && !['admin', 'owner'].includes(activeChat?.role || '')) {
      toast.error('Only admins can post in channels');
      return;
    }
    setIsSending(true);
    try {
      if (editingMessage) {
        await editMessage(editingMessage.id, messageText.trim());
        setEditingMessage(null);
        setMessageText('');
      } else {
        await sendMessage(messageText, 'text', undefined, undefined, undefined, replyTo?.id);
        setMessageText('');
        setReplyTo(null);
        if (activeChat) {
          sendStopTyping(activeChat.id);
        }
      }
      inputRef.current?.focus();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const handleForward = (messageId: string) => {
    setForwardMessageId(messageId);
    setIsForwardOpen(true);
  };

  const handleTogglePin = async (messageId: string, isPinned: boolean) => {
    if (!activeChat) return;
    try {
      await pinMessage(activeChat.id, isPinned ? null : messageId);
      toast.success(isPinned ? 'Message unpinned' : 'Message pinned');
    } catch (e) {
      toast.error('Failed to update pin');
    }
  };

  const handleTyping = () => {
    if (!activeChat) return;
    const now = Date.now();
    if (now - lastTypingRef.current > 900) {
      sendTyping(activeChat.id);
      lastTypingRef.current = now;
    }
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      sendStopTyping(activeChat.id);
    }, 1800);
  };

  const startEditMessage = (messageId: string, content: string) => {
    setEditingMessage({ id: messageId, content });
    setReplyTo(null);
    setMessageText(content);
    inputRef.current?.focus();
  };

  const cancelEditMessage = () => {
    setEditingMessage(null);
    setMessageText('');
    inputRef.current?.focus();
  };

  const startReplyMessage = (messageId: string, content: string, senderName: string) => {
    setReplyTo({ id: messageId, content, senderName });
    setEditingMessage(null);
    inputRef.current?.focus();
  };

  const cancelReplyMessage = () => {
    setReplyTo(null);
    inputRef.current?.focus();
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (activeChat) {
        sendStopTyping(activeChat.id);
      }
    };
  }, [activeChat, sendStopTyping]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;
    if (activeChat.chat_type === 'channel' && !['admin', 'owner'].includes(activeChat?.role || '')) {
      toast.error('Only admins can post in channels');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const { url } = await api.uploadFile(file);
      const type = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
          ? 'video'
          : 'file';
      await sendMessage(url, type, url, file.name, file.size, replyTo?.id);
      setReplyTo(null);
    } catch (e) {
      toast.error('Failed to upload file');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    if (activeChat?.chat_type === 'channel' && !['admin', 'owner'].includes(activeChat?.role || '')) {
      toast.error('Only admins can post in channels');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });
        try {
          const { url } = await api.uploadFile(file);
          if (activeChat) {
            await sendMessage(url, 'audio', url, file.name, file.size, replyTo?.id);
            setReplyTo(null);
          }
        } catch (e) {
          toast.error('Failed to send voice message');
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center messenger-chat relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-[20%] text-primary/20 text-2xl">{'\u2726'}</div>
          <div className="absolute top-32 right-[30%] text-primary/15 text-lg">{'\u2726'}</div>
          <div className="absolute bottom-40 left-[15%] text-primary/10 text-xl">{'\u2726'}</div>
          <div className="absolute top-[60%] right-[20%] text-primary/20 text-sm">{'\u2726'}</div>
        </div>
        <div className="text-center text-[#6b7280] z-10">
          <div className="w-20 h-20 rounded-full bg-white/8 border border-white/10 flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
            <Send size={32} className="text-[#6b7280]" />
          </div>
          <p className="text-lg text-white">Select a chat to start messaging</p>
          <p className="text-sm mt-2">Or start a new conversation</p>
        </div>
      </div>
    );
  }

  const displayName = getChatDisplayName(activeChat);
  const displayAvatar = getChatAvatar(activeChat);
  const otherUser = getOtherUser(activeChat);
  const isOnline = activeChat.is_group ? false : otherUser?.is_online || false;
  const onlineMembers = activeChat.members?.filter((m) => m.is_online).length || 0;
  const isChannel = activeChat.chat_type === 'channel';
  const canPost = !isChannel || ['admin', 'owner'].includes(activeChat.role || '');
  const canPin = activeChat.chat_type === 'direct' || ['admin', 'owner'].includes(activeChat.role || '');
  const lastOwnMessageId = (() => {
    if (!user) return null;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.sender_id === user.id) return messages[i].id;
    }
    return null;
  })();

  const getReadStatus = (msg: typeof messages[number]) => {
    if (!user || !activeChat || msg.sender_id !== user.id) return null;
    if (lastOwnMessageId && msg.id !== lastOwnMessageId) return null;
    const messageTime = new Date(msg.created_at).getTime();
    if (Number.isNaN(messageTime)) return null;

    if (activeChat.is_group) {
      const total = Math.max((activeChat.members?.length || 0) - 1, 0);
      if (total === 0) return null;
      const readers = activeChat.members.filter((m) => (
        m.id !== user.id &&
        m.last_read_at &&
        new Date(m.last_read_at).getTime() >= messageTime
      )).length;
      if (readers > 0) return `Read by ${readers}/${total}`;
      return onlineMembers > 0 ? 'Delivered' : 'Sent';
    }

    const otherReadAt = otherUser?.last_read_at ? new Date(otherUser.last_read_at).getTime() : null;
    if (otherReadAt && otherReadAt >= messageTime) {
      return 'Read';
    }
    return otherUser?.is_online ? 'Delivered' : 'Sent';
  };

  const groupedMessages: { date: string; messages: typeof messages }[] = [];
  let currentDate = '';

  messages.forEach((msg) => {
    const msgDate = new Date(msg.created_at).toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).toUpperCase();

    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  const pinnedPreview = (() => {
    const pinned = activeChat.pinned_message;
    if (!pinned) return '';
    if (pinned.message_type === 'image') return 'Photo';
    if (pinned.message_type === 'video') return 'Video';
    if (pinned.message_type === 'audio') return 'Voice message';
    if (pinned.message_type === 'file') return 'File';
    return pinned.content || 'Message';
  })();

  const chatTypingUsers = typingUsers.get(activeChat.id) || [];
  const canDeleteForAll = ['admin', 'owner'].includes(activeChat.role || '');

  return (
    <div className="flex-1 flex flex-col messenger-chat">
      <div className="messenger-chat-bg" />

      {/* Call Overlay */}
      {callStatus.isActive && callStatus.chatId === activeChat.id && (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-500">
          {callStatus.isVideo && (
            <div className="absolute inset-0">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {localStream && (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute bottom-6 right-6 w-44 h-32 rounded-2xl border border-white/10 object-cover shadow-2xl"
                />
              )}
            </div>
          )}

          {!callStatus.isVideo && (
            <div className="relative mb-12">
              <div className="absolute inset-0 bg-primary/20 blur-[100px] animate-pulse rounded-full" />
              <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-white/10 p-1">
                <AvatarImage
                  src={displayAvatar}
                  alt={displayName}
                  className="w-full h-full rounded-full"
                  fallback={(
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center rounded-full">
                      <span className="text-white text-5xl font-bold">{displayName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                />
              </div>
            </div>
          )}

          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-3xl font-bold text-white mb-2">{displayName}</h2>
            <p className="text-primary animate-pulse mb-12 text-lg font-medium tracking-wide">
              {callStatus.isIncoming ? 'INCOMING CALL...' : (remoteStream ? 'IN CALL' : 'CALLING...')}
            </p>

            <div className="flex items-center gap-12">
              {callStatus.isIncoming && (
                <button onClick={joinCall} className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white transition-all hover:scale-110 hover:shadow-[0_0_40px_rgba(34,197,94,0.4)]">
                  <Phone size={36} />
                </button>
              )}
              <button onClick={endCall} className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-all hover:scale-110 hover:shadow-[0_0_40px_rgba(239,68,68,0.4)]">
                <Phone size={36} className="rotate-[135deg]" />
              </button>
            </div>
          </div>

          {!callStatus.isVideo && remoteStream && (
            <audio ref={remoteAudioRef} autoPlay className="hidden" />
          )}
        </div>
      )}

      <div className="flex items-center justify-between px-4 md:px-8 2xl:px-12 py-4 md:py-5 border-b border-border/60 bg-messenger-bg/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3 md:gap-4 group cursor-pointer" onClick={() => setShowChatInfo(true)}>
          {isMobile && (
            <button
              onClick={(e) => { e.stopPropagation(); setActiveChat(null); }}
              className="p-2 rounded-lg hover:bg-white/5 text-white/50"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="relative">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ring-2 ring-white/5 group-hover:ring-primary/50 transition-all">
              <AvatarImage
                src={displayAvatar}
                alt={displayName}
                className="w-full h-full"
                fallback={<span className="text-white text-xl font-bold">{displayName.charAt(0).toUpperCase()}</span>}
              />
            </div>
          </div>
          <div className="flex flex-col">
            <h2 className="font-bold text-lg text-white leading-tight">{displayName}</h2>
            <p className="text-[12px] font-medium tracking-wide">
              {chatTypingUsers.length > 0 ? (
                <span className="text-primary animate-pulse">
                  {chatTypingUsers.length === 1
                    ? `${activeChat.members.find(m => m.id === chatTypingUsers[0])?.username || 'Someone'} is typing...`
                    : chatTypingUsers.length === 2
                      ? `${activeChat.members.find(m => m.id === chatTypingUsers[0])?.username || 'Someone'} and ${activeChat.members.find(m => m.id === chatTypingUsers[1])?.username || 'someone'} are typing...`
                      : 'Several people are typing...'}
                </span>
              ) : activeChat.chat_type === 'channel' ? (
                <span className="text-white/40">Channel {'\u2022'} {activeChat.members?.length || 0} Subscribers</span>
              ) : activeChat.is_group ? (
                <span className="text-white/40">{activeChat.members?.length || 0} Members {'\u2022'} {onlineMembers} Online</span>
              ) : isOnline ? (
                <span className="text-green-500">Online</span>
              ) : (
                <span className="text-white/20">Offline</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => startCall(activeChat.id, false)}
            className="p-3 rounded-2xl hover:bg-white/5 transition-all group"
          >
            <Phone size={20} className="text-white/40 group-hover:text-white" />
          </button>
          <button
            onClick={() => startCall(activeChat.id, true)}
            className="p-3 rounded-2xl hover:bg-white/5 transition-all group"
          >
            <Video size={20} className="text-white/40 group-hover:text-white" />
          </button>
          <div className="w-px h-6 bg-white/5 mx-2" />
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-3 rounded-2xl hover:bg-white/5 transition-all group">
                <MoreHorizontal size={20} className="text-white/40 group-hover:text-white" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 bg-[#1a1a24] border-white/10 backdrop-blur-xl p-2 rounded-2xl shadow-2xl" align="end">
              <div className="space-y-1">
                <button onClick={() => setShowChatInfo(!showChatInfo)} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-white/5 text-white transition-colors">
                  <AtSign size={16} className="text-white/40" /> {showChatInfo ? 'Hide' : 'View'} Info
                </button>
                <button onClick={async () => {
                  const data = await createInvite(activeChat.id);
                  const url = `${window.location.origin}/join/${data.code}`;
                  navigator.clipboard.writeText(url);
                  toast.success('Invite link copied!');
                }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-white/5 text-white transition-colors">
                  <Copy size={16} className="text-white/40" /> Share Link
                </button>
                <button onClick={() => muteChat(activeChat.id, !activeChat.muted)} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-white/5 text-white transition-colors">
                  <Pause size={16} className="text-white/40" /> {activeChat.muted ? 'Unmute' : 'Mute'}
                </button>
                <div className="h-px bg-white/5 my-1" />
                <button
                  onClick={() => deleteMessages(activeChat.id)}
                  disabled={!['admin', 'owner'].includes(activeChat.role || '')}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors",
                    ['admin', 'owner'].includes(activeChat.role || '')
                      ? "hover:bg-white/5 text-red-400"
                      : "opacity-50 cursor-not-allowed text-white/20"
                  )}
                >
                  <Square size={16} className={['admin', 'owner'].includes(activeChat.role || '') ? "text-red-400/50" : "text-white/20"} />
                  Clear History {!['admin', 'owner'].includes(activeChat.role || '') && '(Admin only)'}
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 2xl:px-12 py-5 md:py-6 messenger-scrollbar relative z-10 scroll-smooth">
        {activeChat.pinned_message && (
          <div className="sticky top-0 z-20 mb-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-4 py-2">
              <button
                onClick={() => openMessageContext(activeChat.pinned_message!.id)}
                className="flex items-center gap-3 text-left text-white/80 hover:text-white transition-colors"
              >
                <Bookmark size={14} className="text-primary" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Pinned</span>
                  <span className="text-xs font-medium truncate max-w-[320px] md:max-w-[480px]">
                    {pinnedPreview}
                  </span>
                </div>
              </button>
              {canPin && (
                <button
                  onClick={() => handleTogglePin(activeChat.pinned_message!.id, true)}
                  className="text-[11px] text-white/40 hover:text-white transition-colors"
                >
                  Unpin
                </button>
              )}
            </div>
          </div>
        )}
        {isLoadingMessages ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-white/20">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-sm font-medium">Loading history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#6b7280]">
            <div className="w-32 h-32 rounded-full bg-white/[0.02] flex items-center justify-center mb-6">
              <Send size={48} className="text-white/5" />
            </div>
            <p className="text-xl font-bold text-white mb-2">Start a conversation</p>
            <p className="text-sm text-white/30">Send a message to begin your journey</p>
          </div>
        ) : (
          groupedMessages.map((group, idx) => (
            <div key={idx}>
              <div className="flex items-center justify-center my-10">
                <div className="bg-white/[0.03] border border-white/5 backdrop-blur-md px-6 py-2 rounded-full">
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">{group.date}</span>
                </div>
              </div>
              {group.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender_id === user?.id}
                  canDeleteForAll={canDeleteForAll}
                  readStatus={getReadStatus(msg)}
                  isPinned={activeChat.pinned_message?.id === msg.id}
                  onEdit={startEditMessage}
                  onDeleteForMe={deleteMessageForMe}
                  onDeleteForAll={deleteMessage}
                  onReply={startReplyMessage}
                  onForward={handleForward}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 md:px-8 2xl:px-12 py-5 md:py-6 z-20">
        {replyTo && (
          <div className="flex items-center justify-between text-xs text-white/60 px-4 mb-2">
            <div className="truncate">
              Replying to <span className="text-white/80">{replyTo.senderName}</span>: {replyTo.content}
            </div>
            <button
              onClick={cancelReplyMessage}
              className="flex items-center gap-1 text-white/60 hover:text-white transition-colors flex-shrink-0 ml-2"
            >
              <X size={12} />
              Cancel
            </button>
          </div>
        )}
        {editingMessage && (
          <div className="flex items-center justify-between text-xs text-white/60 px-4 mb-2">
            <span>Editing message</span>
            <button
              onClick={cancelEditMessage}
              className="flex items-center gap-1 text-white/60 hover:text-white transition-colors"
            >
              <X size={12} />
              Cancel
            </button>
          </div>
        )}
        <div className="capsule-input w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-2.5 text-white/30 hover:text-white transition-all hover:bg-white/5 rounded-full">
                <Smile size={22} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-[#1a1a24] border-white/10 backdrop-blur-2xl p-4 rounded-3xl" side="top" align="start">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {PICKER_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setMessageText(prev => prev + emoji)}
                    className="w-9 h-9 flex items-center justify-center text-xl hover:bg-white/10 rounded-xl transition-all hover:scale-110 flex-shrink-0"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <input
            ref={inputRef}
            type="text"
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              handleTyping();
            }}
            onKeyPress={handleKeyPress}
            onBlur={() => activeChat && sendStopTyping(activeChat.id)}
            placeholder={
              !canPost
                ? 'Only admins can post in channels'
                : isRecording
                  ? 'Listening...'
                  : (editingMessage ? 'Edit message...' : 'Type a message...')
            }
            disabled={isRecording || !canPost}
            className="flex-1 bg-transparent border-0 text-[15px] font-medium text-white placeholder:text-white/20 focus:outline-none px-2 disabled:opacity-60"
          />

          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!canPost}
            className="p-2.5 text-white/30 hover:text-white transition-all hover:bg-white/5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Paperclip size={22} />
          </button>

          {messageText.trim() ? (
            <button
              onClick={handleSend}
              disabled={isSending || !canPost}
              className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
            >
              {isSending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          ) : (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!canPost}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center text-white transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed",
                isRecording ? "bg-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]" : "bg-primary hover:scale-105"
              )}
            >
              {isRecording ? <Pause size={20} /> : <Mic size={20} />}
            </button>
          )}
        </div>
      </div>

      <Dialog
        open={isForwardOpen}
        onOpenChange={(open) => {
          setIsForwardOpen(open);
          if (!open) {
            setForwardMessageId(null);
            setForwardQuery('');
          }
        }}
      >
        <DialogContent className="messenger-panel border-white/10">
          <DialogHeader>
            <DialogTitle>Forward message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <input
              type="text"
              value={forwardQuery}
              onChange={(e) => setForwardQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full messenger-input rounded-2xl px-4 py-2.5 text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all text-white"
            />
            <div className="space-y-2 max-h-72 overflow-y-auto messenger-scrollbar">
              {chats
                .filter((chat) => {
                  const name = getChatDisplayName(chat);
                  return name.toLowerCase().includes(forwardQuery.toLowerCase());
                })
                .map((chat) => (
                  <button
                    key={chat.id}
                    onClick={async () => {
                      if (!forwardMessageId) return;
                      setIsForwarding(true);
                      try {
                        await forwardMessage(forwardMessageId, chat.id);
                        toast.success('Message forwarded');
                        setIsForwardOpen(false);
                        setForwardMessageId(null);
                        setForwardQuery('');
                      } catch (e) {
                        toast.error('Failed to forward');
                      } finally {
                        setIsForwarding(false);
                      }
                    }}
                    disabled={isForwarding}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 text-left disabled:opacity-60"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <AvatarImage
                        src={getChatAvatar(chat)}
                        alt={getChatDisplayName(chat)}
                        className="w-full h-full"
                        fallback={<span className="text-white font-semibold">{getChatDisplayName(chat).charAt(0).toUpperCase()}</span>}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-white truncate">{getChatDisplayName(chat)}</p>
                      <p className="text-xs text-white/40 truncate">
                        {chat.chat_type === 'channel' ? 'Channel' : chat.is_group ? 'Group' : 'Direct chat'}
                      </p>
                    </div>
                  </button>
                ))}
              {!isForwarding && chats.length === 0 && (
                <p className="text-center text-sm text-white/40 py-6">No chats available</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
