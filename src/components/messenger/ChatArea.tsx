import { Phone, Video, MoreHorizontal, Smile, Paperclip, Send, Mic, Pause, AtSign, Loader2, Copy, Square, Image as ImageIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useMessenger } from '@/context/MessengerContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    message_type: string;
    sender?: { id: string; username: string; avatar: string | null };
    reactions?: { emoji: string; user_id: string; username: string }[];
    is_saved?: boolean;
    file_url?: string;
  };
  isOwn: boolean;
}

const MessageBubble = ({ message, isOwn }: MessageBubbleProps) => {
  const { addReaction, removeReaction, saveMessage, unsaveMessage } = useMessenger();
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const senderName = message.sender?.username || 'Unknown';
  const senderAvatar = message.sender?.avatar;

  const handleReactionClick = (emoji: string) => {
    const hasReacted = message.reactions?.some(r => r.emoji === emoji && r.user_id === message.sender_id);
    if (hasReacted) removeReaction(message.id, emoji);
    else addReaction(message.id, emoji);
  };

  const renderContent = () => {
    if (message.message_type === 'image') {
      return (
        <div className="rounded-2xl overflow-hidden max-w-[400px] cursor-pointer ring-1 ring-white/10" onClick={() => window.open(message.content, '_blank')}>
          <img src={message.content} alt="Shared image" className="w-full h-auto object-cover" />
        </div>
      );
    }
    if (message.message_type === 'file') {
      return (
        <div className="flex items-center gap-4 p-2 min-w-[240px] cursor-pointer group/file" onClick={() => window.open(message.file_url || message.content, '_blank')}>
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 group-hover/file:bg-primary/20 transition-colors">
            <Paperclip size={22} className="text-white" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold truncate text-white">
              {message.content.split('/').pop() || 'File'}
            </span>
            <span className="text-[10px] text-white/50 uppercase tracking-wider font-bold">Download</span>
          </div>
        </div>
      );
    }
    if (message.message_type === 'audio') {
      return (
        <div className="flex items-center gap-3 min-w-[240px] bg-white/5 p-3 rounded-xl border border-white/5">
          <Mic size={18} className="text-primary" />
          <div className="flex-1 h-1 bg-white/10 rounded-full relative overflow-hidden">
            <div className="absolute inset-0 bg-primary w-1/3" />
          </div>
          <span className="text-[10px] text-white/50">12"</span>
        </div>
      );
    }
    return <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>;
  };

  return (
    <div className={cn(
      "flex mb-4 group/message",
      isOwn ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex gap-3 max-w-[85%]",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}>
        {!isOwn && (
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/10 mt-auto">
            {senderAvatar ? (
              <img src={senderAvatar} alt={senderName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">{senderName.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
        )}
        <div className="flex flex-col">
          <div className={cn(
            "flex items-center gap-2 mb-1 px-1",
            isOwn ? "justify-end" : "justify-start"
          )}>
            {!isOwn && <span className="text-[11px] font-bold text-white/80">{senderName}</span>}
            <span className="text-[10px] text-white/30">{time}</span>
          </div>

          <div className={cn(
            "message-bubble",
            isOwn ? "message-bubble-mine" : "message-bubble-other",
            message.message_type === 'image' && "p-1 bg-transparent border-none"
          )}>
            {renderContent()}

            {message.reactions && message.reactions.length > 0 && (
              <div className={cn(
                "absolute -bottom-4 flex flex-wrap gap-1",
                isOwn ? "right-0" : "left-0"
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
              "absolute top-0 opacity-0 group-hover/message:opacity-100 transition-all duration-200 flex gap-1",
              isOwn ? "-left-12 flex-row-reverse" : "-right-12"
            )}>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-white/50">
                    <Smile size={14} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 bg-black/90 border-white/10 backdrop-blur-xl p-2" side="top">
                  <div className="grid grid-cols-6 gap-1">
                    {['👍', '🔥', '❤️', '😂', '😮', '😢'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleReactionClick(emoji)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <button
                onClick={() => message.is_saved ? unsaveMessage(message.id) : saveMessage(message.id)}
                className={cn(
                  "p-1.5 rounded-lg border border-white/5 transition-all",
                  message.is_saved ? "bg-primary/20 text-primary" : "bg-white/5 hover:bg-white/10 text-white/50"
                )}
              >
                <AtSign size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DateDivider = ({ date }: { date: string }) => (
  <div className="flex items-center justify-center my-6">
    <div className="bg-white/8 border border-white/10 backdrop-blur-md px-4 py-1.5 rounded-full">
      <span className="text-[11px] text-[#6b7280] font-medium">{date}</span>
    </div>
  </div>
);

export const ChatArea = () => {
  const { user } = useAuth();
  const {
    activeChat,
    messages,
    isLoadingMessages,
    sendMessage,
    getChatDisplayName,
    getChatAvatar,
    getOtherUser,
    typingUsers,
    callStatus,
    startCall,
    endCall,
    joinCall,
    muteChat,
    deleteMessages,
    searchMessages,
    createInvite,
    showChatInfo,
    setShowChatInfo,
  } = useMessenger();

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() || isSending) return;
    setIsSending(true);
    try {
      await sendMessage(messageText);
      setMessageText('');
      inputRef.current?.focus();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    try {
      const { url } = await api.uploadFile(file);
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      await sendMessage(url, type, url, file.name, file.size);
    } catch (e) {
      toast.error('Failed to upload file');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
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
            await sendMessage(url, 'audio', url, file.name, file.size);
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
          <div className="absolute top-20 left-[20%] text-primary/20 text-2xl">✦</div>
          <div className="absolute top-32 right-[30%] text-primary/15 text-lg">✦</div>
          <div className="absolute bottom-40 left-[15%] text-primary/10 text-xl">✦</div>
          <div className="absolute top-[60%] right-[20%] text-primary/20 text-sm">✦</div>
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

  const chatTypingUsers = typingUsers.get(activeChat.id) || [];

  return (
    <div className="flex-1 flex flex-col messenger-chat">
      <div className="messenger-chat-bg" />

      {/* Call Overlay */}
      {callStatus.isActive && callStatus.chatId === activeChat.id && (
        <div className="absolute inset-0 z-50 bg-[#0e0e12]/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-primary/20 blur-[100px] animate-pulse rounded-full" />
            <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-white/10 p-1">
              {displayAvatar ? (
                <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center rounded-full">
                  <span className="text-white text-5xl font-bold">{displayName.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">{displayName}</h2>
          <p className="text-primary animate-pulse mb-12 text-lg font-medium tracking-wide">
            {callStatus.isIncoming ? 'INCOMING CALL...' : 'CALLING...'}
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
      )}

      <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-[#0b0b0f]/60 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setShowChatInfo(true)}>
          <div className="relative">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ring-2 ring-white/5 group-hover:ring-primary/50 transition-all">
              {displayAvatar ? (
                <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xl font-bold">{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <h2 className="font-bold text-lg text-white leading-tight">{displayName}</h2>
            <p className="text-[12px] font-medium tracking-wide">
              {chatTypingUsers.length > 0 ? (
                <span className="text-primary animate-pulse">Arshia is typing...</span>
              ) : activeChat.is_group ? (
                <span className="text-white/40">{activeChat.members?.length || 0} Members • 12 Online</span>
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
                <button onClick={() => deleteMessages(activeChat.id)} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-white/5 text-red-400 transition-colors">
                  <Square size={16} className="text-red-400/50" /> Clear History
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 messenger-scrollbar relative z-10 scroll-smooth">
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
                />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-8 py-6 z-20">
        <div className="capsule-input max-w-4xl mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-2.5 text-white/30 hover:text-white transition-all hover:bg-white/5 rounded-full">
                <Smile size={22} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-[#1a1a24] border-white/10 backdrop-blur-2xl p-4 rounded-3xl" side="top" align="start">
              <div className="grid grid-cols-7 gap-2">
                {['😀', '😂', '😍', '🥰', '😎', '🤔', '😢', '😡', '👍', '👎', '❤️', '🔥', '✨', '🎉', '👋', '🙏', '💪', '🤝', '👀', '💯', '🚀'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setMessageText(prev => prev + emoji)}
                    className="w-9 h-9 flex items-center justify-center text-xl hover:bg-white/10 rounded-xl transition-all hover:scale-110"
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
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isRecording ? "Listening..." : "Good bye 👋"}
            disabled={isRecording}
            className="flex-1 bg-transparent border-0 text-[15px] font-medium text-white placeholder:text-white/20 focus:outline-none px-2"
          />

          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

          <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-white/30 hover:text-white transition-all hover:bg-white/5 rounded-full">
            <Paperclip size={22} />
          </button>

          {messageText.trim() ? (
            <button
              onClick={handleSend}
              disabled={isSending}
              className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95"
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
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center text-white transition-all active:scale-95",
                isRecording ? "bg-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]" : "bg-primary hover:scale-105"
              )}
            >
              {isRecording ? <Pause size={20} /> : <Mic size={20} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
