import { Phone, Video, MoreHorizontal, Smile, Paperclip, Send, Mic, Pause, AtSign, Loader2, Copy, Square } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useMessenger } from '@/context/MessengerContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    sender?: { id: string; username: string; avatar: string | null };
  };
  isOwn: boolean;
}

const MessageBubble = ({ message, isOwn }: MessageBubbleProps) => {
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const senderName = message.sender?.username || 'Unknown';
  const senderAvatar = message.sender?.avatar;

  if (isOwn) {
    return (
      <div className="flex justify-end mb-4 animate-in slide-in-from-right-5 duration-300">
        <div className="flex items-end gap-2 max-w-[70%]">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-[#6b7280]">{time}</span>
              <span className="text-[11px] text-white font-medium">{senderName}</span>
            </div>
            <div className="bg-gradient-to-b from-primary to-primary/80 text-white rounded-2xl rounded-br-sm px-4 py-2.5 shadow-lg shadow-black/20">
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center">
            {senderAvatar ? (
              <img src={senderAvatar} alt={senderName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xs font-semibold">{senderName.charAt(0).toUpperCase()}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4 animate-in slide-in-from-left-5 duration-300">
      <div className="flex items-end gap-2 max-w-[70%]">
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          {senderAvatar ? (
            <img src={senderAvatar} alt={senderName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-xs font-semibold">{senderName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-white font-medium">{senderName}</span>
            <span className="text-[11px] text-[#6b7280]">{time}</span>
          </div>
          <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-2.5 backdrop-blur-md">
            <p className="text-sm text-white whitespace-pre-wrap break-words">{message.content}</p>
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

const VoiceMessage = () => (
  <div className="flex items-center gap-3 bg-white/8 border border-white/10 backdrop-blur-md rounded-2xl px-4 py-3 max-w-xs">
    <button className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
      <Pause size={14} className="text-white" />
    </button>
    <div className="flex-1 flex items-center gap-0.5">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="w-0.5 bg-white/60 rounded-full"
          style={{ height: `${Math.random() * 20 + 8}px` }}
        />
      ))}
    </div>
    <span className="text-xs text-[#6b7280]">12''</span>
    <button className="w-6 h-6 rounded-full bg-white/8 border border-white/10 flex items-center justify-center">
      <AtSign size={12} className="text-[#6b7280]" />
    </button>
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
    showChatInfo,
    setShowChatInfo,
  } = useMessenger();

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <div className="flex-1 flex flex-col messenger-chat relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-24 left-[10%] text-primary/20 text-2xl">✦</div>
        <div className="absolute top-40 right-[25%] text-primary/15 text-lg">✦</div>
        <div className="absolute bottom-52 left-[8%] text-primary/10 text-xl">✦</div>
        <div className="absolute top-[50%] right-[15%] text-primary/20 text-sm">✦</div>
        <div className="absolute top-[30%] left-[30%] text-primary/10 text-xs">✦</div>
        <div className="absolute bottom-[30%] right-[35%] text-primary/15 text-lg">✦</div>
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 messenger-panel z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              {displayAvatar ? (
                <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-semibold">{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
          <div>
            <h2 className="font-semibold text-white">{displayName}</h2>
            <p className="text-xs text-[#6b7280]">
              {chatTypingUsers.length > 0 ? (
                <span className="text-green-500">typing...</span>
              ) : activeChat.is_group ? (
                `${activeChat.members?.length || 0} members`
              ) : isOnline ? (
                <span className="text-green-500">Online</span>
              ) : (
                'Offline'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {activeChat.is_group && activeChat.members && (
            <div className="flex -space-x-2 mr-3">
              {activeChat.members.slice(0, 4).map((member) => (
                <div key={member.id} className="w-7 h-7 rounded-full overflow-hidden border-2 border-transparent bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-xs">{member.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              ))}
              {activeChat.members.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-white/8 border border-white/10 flex items-center justify-center">
                  <span className="text-[10px] text-[#6b7280]">+{activeChat.members.length - 4}</span>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => toast.info('Copy link coming soon!')}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <Copy size={18} className="text-[#6b7280]" />
          </button>
          <button
            onClick={() => toast.info('Voice calls coming soon!')}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <Phone size={18} className="text-[#6b7280]" />
          </button>
          <button
            onClick={() => toast.info('Video calls coming soon!')}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <Square size={18} className="text-[#6b7280]" />
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-2 rounded-xl hover:bg-white/5 transition-colors">
                <MoreHorizontal size={18} className="text-[#6b7280]" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 messenger-panel border-white/10 p-2">
              <div className="space-y-1">
                <button
                  onClick={() => setShowChatInfo(!showChatInfo)}
                  className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-white/5 text-white"
                >
                  {showChatInfo ? 'Hide' : 'Show'} group info
                </button>
                <button
                  onClick={() => toast.info('Mute notifications coming soon!')}
                  className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-white/5 text-white"
                >
                  Mute notifications
                </button>
                <button
                  onClick={() => toast.info('Search in chat coming soon!')}
                  className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-white/5 text-white"
                >
                  Search in chat
                </button>
                <button
                  onClick={() => toast.info('Clear history coming soon!')}
                  className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-white/5 text-destructive"
                >
                  Clear history
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 messenger-scrollbar relative z-10">
        {isLoadingMessages ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-[#6b7280]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#6b7280]">
            <p className="text-white">No messages yet</p>
            <p className="text-sm">Send a message to start the conversation</p>
          </div>
        ) : (
          groupedMessages.map((group, idx) => (
            <div key={idx}>
              <DateDivider date={group.date} />
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

      <div className="px-6 py-4 z-10">
        <div className="flex items-center gap-3 messenger-panel border border-white/10 rounded-2xl px-4 py-3">
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-[#6b7280] hover:text-white transition-colors">
                <Smile size={20} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 messenger-panel border-white/10 p-2" side="top" align="start">
              <div className="grid grid-cols-8 gap-1">
                {['😀', '😂', '😍', '🥰', '😎', '🤔', '😢', '😡', '👍', '👎', '❤️', '🔥', '✨', '🎉', '👋', '🙏', '💪', '🤝', '👀', '💯', '🚀', '💡', '☕', '🍕'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setMessageText(prev => prev + emoji)}
                    className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/5 rounded transition-colors"
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
            placeholder="Good bye 👋"
            className="flex-1 bg-transparent border-0 text-sm text-white placeholder:text-[#6b7280] focus:outline-none"
          />
          <button
            onClick={() => toast.info('File attachments coming soon!')}
            className="text-[#6b7280] hover:text-white transition-colors"
          >
            <Paperclip size={20} />
          </button>
          <button
            onClick={handleSend}
            disabled={!messageText.trim() || isSending}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
              messageText.trim() && !isSending
                ? 'bg-primary hover:bg-primary/90 cursor-pointer'
                : 'bg-primary cursor-pointer'
            )}
          >
            {isSending ? (
              <Loader2 size={18} className="text-white animate-spin" />
            ) : (
              <Send size={18} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
