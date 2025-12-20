import { useEffect, useRef, useState } from 'react';
import { Search, Plus, MessageCircle, Loader2, Phone, Video, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMessenger } from '@/context/MessengerContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { AvatarImage } from '@/components/AvatarImage';

type ChatTab = 'all' | 'groups' | 'channels' | 'contacts';

interface ChatItemProps {
  chat: {
    id: string;
    name: string | null;
    is_group: boolean;
    chat_type?: 'direct' | 'group' | 'channel';
    avatar: string | null;
    members: { id: string; username: string; avatar: string | null; is_online: boolean }[];
    last_message: { content: string; created_at: string; message_type?: string } | null;
  };
  isActive: boolean;
  onClick: () => void;
  displayName: string;
  displayAvatar: string | null;
  isOnline: boolean;
}

const ChatItem = ({ chat, isActive, onClick, displayName, displayAvatar, isOnline }: ChatItemProps) => {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isVoiceMessage = chat.last_message?.message_type === 'audio';
  const isImageMessage = chat.last_message?.message_type === 'image';

  const getMessagePreview = () => {
    if (isVoiceMessage) return '\u{1F3A4} Voice message';
    if (isImageMessage) return '\u{1F5BC}\u{FE0F} Photo';
    if (chat.last_message?.message_type === 'file') return '\u{1F4CE} File';
    if (chat.last_message?.message_type === 'video') return '\u{1F3AC} Video';
    return chat.last_message?.content || 'No messages yet';
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200',
        isActive ? 'bg-white/10' : 'hover:bg-white/5'
      )}
    >
      <div className="relative">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <AvatarImage
            src={displayAvatar}
            alt={displayName}
            className="w-full h-full"
            fallback={<span className="text-white font-semibold text-lg">{displayName.charAt(0).toUpperCase()}</span>}
          />
        </div>
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-transparent" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm truncate text-white/90">{displayName}</span>
        </div>
        <p className={cn(
          "text-xs truncate mt-0.5 text-white/55",
          isVoiceMessage ? "text-primary" : ""
        )}>
          {getMessagePreview()}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-[9px] text-white/30">
          {chat.last_message?.created_at ? formatTime(chat.last_message.created_at) : ''}
        </span>
      </div>
    </div>
  );
};

export const ChatList = () => {
  const { user } = useAuth();
  const {
    chats,
    activeChat,
    activeChatTab,
    searchQuery,
    isLoadingChats,
    setActiveChat,
    setActiveChatTab,
    setSearchQuery,
    createDirectChat,
    createGroupChat,
    createChannelChat,
    searchMessagesGlobal,
    openMessageContext,
    getChatDisplayName,
    getChatAvatar,
    getOtherUser,
    callStatus,
    startCall,
    joinCall
  } = useMessenger();

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isNewChannelOpen, setIsNewChannelOpen] = useState(false);
  const [isNewCallOpen, setIsNewCallOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchMode, setSearchMode] = useState<'chats' | 'users' | 'messages'>('chats');
  const [searchInput, setSearchInput] = useState('');
  const [panelUserResults, setPanelUserResults] = useState<{ id: string; username: string; avatar: string | null; is_online: boolean }[]>([]);
  const [panelMessageResults, setPanelMessageResults] = useState<{ id: string; chat_id: string; chat_name: string | null; chat_type?: string; content: string; message_type: string; created_at: string; sender?: { username: string | null } }[]>([]);
  const [isPanelSearching, setIsPanelSearching] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; avatar: string | null; is_online: boolean }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [channelName, setChannelName] = useState('');
  const [channelMembers, setChannelMembers] = useState<string[]>([]);

  const tabs: { key: ChatTab; label: string }[] = [
    { key: 'all', label: 'All Chats' },
    { key: 'groups', label: 'Groups' },
    { key: 'channels', label: 'Channels' },
    { key: 'contacts', label: 'Contacts' },
  ];

  const filteredChats = (chats || []).filter((chat) => {
    const name = getChatDisplayName(chat);
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeChatTab === 'groups') return (chat.chat_type === 'group' || (chat.is_group && chat.chat_type !== 'channel')) && matchesSearch;
    if (activeChatTab === 'channels') return chat.chat_type === 'channel' && matchesSearch;
    if (activeChatTab === 'contacts') return (chat.chat_type ? chat.chat_type === 'direct' : !chat.is_group) && matchesSearch;
    return matchesSearch;
  });

  const searchUsers = async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await api.searchUsers(q);
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartDirectChat = async (userId: string) => {
    try {
      const chat = await createDirectChat(userId);
      setActiveChat(chat);
      setIsNewChatOpen(false);
      setUserSearchQuery('');
      setSearchResults([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartCall = async (userId: string) => {
    try {
      const chat = await createDirectChat(userId);
      setActiveChat(chat);
      startCall(chat.id);
      setIsNewCallOpen(false);
      setUserSearchQuery('');
      setSearchResults([]);
    } catch (e) {
      console.error(e);
      toast.error("Failed to start call");
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    try {
      const chat = await createGroupChat(groupName, selectedMembers);
      setActiveChat(chat);
      setIsNewGroupOpen(false);
      setGroupName('');
      setSelectedMembers([]);
      setUserSearchQuery('');
      setSearchResults([]);
    } catch (e) {
      console.error(e);
    }
  };

  const getMessagePreview = (message: { content: string; message_type: string }) => {
    if (message.message_type === 'image') return 'Photo';
    if (message.message_type === 'video') return 'Video';
    if (message.message_type === 'audio') return 'Voice message';
    if (message.message_type === 'file') return 'File';
    return message.content || 'Message';
  };

  const runPanelSearch = async (value: string, mode: 'chats' | 'users' | 'messages') => {
    if (!value.trim()) {
      setPanelUserResults([]);
      setPanelMessageResults([]);
      if (mode === 'chats') setSearchQuery('');
      return;
    }

    if (mode === 'chats') {
      setSearchQuery(value);
      return;
    }

    setSearchQuery('');
    setIsPanelSearching(true);
    try {
      if (mode === 'users') {
        const results = await api.searchUsers(value);
        setPanelUserResults(results);
        setPanelMessageResults([]);
      } else {
        const results = await searchMessagesGlobal(value);
        setPanelMessageResults(results);
        setPanelUserResults([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPanelSearching(false);
    }
  };

  useEffect(() => {
    const handler = () => {
      setSearchMode('users');
      setSearchInput('');
      setSearchQuery('');
      setPanelUserResults([]);
      setPanelMessageResults([]);
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    };
    window.addEventListener('focus-chat-search', handler);
    return () => window.removeEventListener('focus-chat-search', handler);
  }, [setSearchQuery]);

  useEffect(() => {
    if (!searchInput.trim()) {
      setPanelUserResults([]);
      setPanelMessageResults([]);
      if (searchMode === 'chats') setSearchQuery('');
      return;
    }
    runPanelSearch(searchInput, searchMode);
  }, [searchMode]);

  const handleCreateChannel = async () => {
    if (!channelName.trim()) return;
    try {
      const chat = await createChannelChat(channelName, channelMembers);
      setActiveChat(chat);
      setIsNewChannelOpen(false);
      setChannelName('');
      setChannelMembers([]);
      setUserSearchQuery('');
      setSearchResults([]);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleChannelMember = (userId: string) => {
    setChannelMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const getIsOnline = (chat: typeof chats[0]) => {
    if (chat.is_group || chat.chat_type === 'channel') return false;
    const other = getOtherUser(chat);
    return other?.is_online || false;
  };

  const activeCallChat = callStatus.isActive && callStatus.chatId ? chats.find(c => c.id === callStatus.chatId) : null;
  const activeCallName = activeCallChat ? getChatDisplayName(activeCallChat) : null;

  return (
    <div className="w-full md:w-[360px] xl:w-[380px] 2xl:w-[420px] messenger-panel flex flex-col border-r border-white/10 messenger-scrollbar overflow-hidden">
      <div className="p-4">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" size={16} />
          <input
            type="text"
            placeholder={searchMode === 'chats' ? 'Search chats...' : searchMode === 'users' ? 'Search users...' : 'Search messages...'}
            value={searchInput}
            onChange={(e) => {
              const value = e.target.value;
              setSearchInput(value);
              runPanelSearch(value, searchMode);
            }}
            ref={searchInputRef}
            className="w-full messenger-input rounded-2xl pl-10 pr-4 py-2.5 text-sm placeholder:text-[#6b7280] focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all text-white"
          />
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1">
            {(['chats', 'users', 'messages'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSearchMode(mode)}
                className={cn(
                  'px-3 py-1 text-[11px] font-semibold rounded-full transition-all',
                  searchMode === mode ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white'
                )}
              >
                {mode === 'chats' ? 'Chats' : mode === 'users' ? 'Users' : 'Messages'}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-[#6b7280] hover:text-white">
                  <MessageCircle size={16} />
                </Button>
              </DialogTrigger>
              <DialogContent className="messenger-panel border-white/10">
                <DialogHeader>
                  <DialogTitle>New Chat</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Search users..."
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    className="messenger-input border-white/10"
                  />
                  {isSearching && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="animate-spin" />
                    </div>
                  )}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => handleStartDirectChat(u.id)}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <AvatarImage
                            src={u.avatar}
                            alt={u.username}
                            className="w-full h-full rounded-full"
                            fallback={<span className="text-white font-semibold">{u.username.charAt(0).toUpperCase()}</span>}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{u.username}</p>
                          <p className="text-xs text-[#6b7280]">
                            {u.is_online ? 'Online' : 'Offline'}
                          </p>
                        </div>
                      </div>
                    ))}
                    {!isSearching && userSearchQuery && searchResults.length === 0 && (
                      <p className="text-center text-sm text-[#6b7280] py-4">No users found</p>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isNewGroupOpen} onOpenChange={setIsNewGroupOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-[#6b7280] hover:text-white">
                  <Plus size={16} />
                </Button>
              </DialogTrigger>
              <DialogContent className="messenger-panel border-white/10">
                <DialogHeader>
                  <DialogTitle>New Group</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Group name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="messenger-input border-white/10"
                  />
                  <Input
                    placeholder="Search users to add..."
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    className="messenger-input border-white/10"
                  />
                  {selectedMembers.length > 0 && (
                    <p className="text-sm text-[#6b7280]">
                      {selectedMembers.length} member(s) selected
                    </p>
                  )}
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {searchResults.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => toggleMember(u.id)}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-xl cursor-pointer',
                          selectedMembers.includes(u.id) ? 'bg-primary/20' : 'hover:bg-white/5'
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <AvatarImage
                            src={u.avatar}
                            alt={u.username}
                            className="w-full h-full rounded-full"
                            fallback={<span className="text-white text-sm">{u.username.charAt(0).toUpperCase()}</span>}
                          />
                        </div>
                        <span className="text-sm">{u.username}</span>
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleCreateGroup} className="w-full" disabled={!groupName.trim() || selectedMembers.length === 0}>
                    Create Group
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isNewChannelOpen} onOpenChange={setIsNewChannelOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-[#6b7280] hover:text-white">
                  <Megaphone size={16} />
                </Button>
              </DialogTrigger>
              <DialogContent className="messenger-panel border-white/10">
                <DialogHeader>
                  <DialogTitle>New Channel</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Channel name"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    className="messenger-input border-white/10"
                  />
                  <Input
                    placeholder="Search users to add (optional)..."
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    className="messenger-input border-white/10"
                  />
                  {channelMembers.length > 0 && (
                    <p className="text-sm text-[#6b7280]">
                      {channelMembers.length} member(s) selected
                    </p>
                  )}
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {searchResults.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => toggleChannelMember(u.id)}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-xl cursor-pointer',
                          channelMembers.includes(u.id) ? 'bg-primary/20' : 'hover:bg-white/5'
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <AvatarImage
                            src={u.avatar}
                            alt={u.username}
                            className="w-full h-full rounded-full"
                            fallback={<span className="text-white text-sm">{u.username.charAt(0).toUpperCase()}</span>}
                          />
                        </div>
                        <span className="text-sm">{u.username}</span>
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleCreateChannel} className="w-full" disabled={!channelName.trim()}>
                    Create Channel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {searchMode === 'chats' && (
          <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-1 w-fit mb-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveChatTab(tab.key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200',
                  activeChatTab === tab.key
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-white/40 hover:text-white'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 messenger-scrollbar">
        {searchMode === 'chats' ? (
          isLoadingChats ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-[#6b7280]" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-8 text-[#6b7280] text-sm">
              {chats.length === 0 ? 'No chats yet. Start a new conversation!' : 'No chats found'}
            </div>
          ) : (
            filteredChats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                isActive={activeChat?.id === chat.id}
                onClick={() => setActiveChat(chat)}
                displayName={getChatDisplayName(chat)}
                displayAvatar={getChatAvatar(chat)}
                isOnline={getIsOnline(chat)}
              />
            ))
          )
        ) : searchMode === 'users' ? (
          isPanelSearching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-[#6b7280]" />
            </div>
          ) : searchInput.trim() === '' ? (
            <div className="text-center py-8 text-[#6b7280] text-sm">
              Start typing to search users
            </div>
          ) : panelUserResults.length === 0 ? (
            <div className="text-center py-8 text-[#6b7280] text-sm">
              No users found
            </div>
          ) : (
            panelUserResults.map((u) => (
              <div
                key={u.id}
                onClick={async () => handleStartDirectChat(u.id)}
                className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200 hover:bg-white/5"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <AvatarImage
                    src={u.avatar}
                    alt={u.username}
                    className="w-full h-full"
                    fallback={<span className="text-white font-semibold text-sm">{u.username.charAt(0).toUpperCase()}</span>}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-white truncate">{u.username}</p>
                  <p className="text-xs text-white/40">{u.is_online ? 'Online' : 'Offline'}</p>
                </div>
              </div>
            ))
          )
        ) : (
          isPanelSearching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-[#6b7280]" />
            </div>
          ) : searchInput.trim() === '' ? (
            <div className="text-center py-8 text-[#6b7280] text-sm">
              Start typing to search messages
            </div>
          ) : panelMessageResults.length === 0 ? (
            <div className="text-center py-8 text-[#6b7280] text-sm">
              No messages found
            </div>
          ) : (
            panelMessageResults.map((m) => (
              <button
                key={m.id}
                onClick={async () => {
                  try {
                    await openMessageContext(m.id);
                  } catch (e) {
                    toast.error('Failed to open message');
                  }
                }}
                className="w-full text-left flex flex-col gap-1 p-3 rounded-2xl hover:bg-white/5 transition-all"
              >
                <div className="flex items-center justify-between text-[10px] text-white/30">
                  <span className="truncate">{m.chat_name || (m.chat_type === 'direct' ? 'Direct chat' : 'Chat')}</span>
                  <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text-sm text-white/70 truncate">
                  <span className="text-white/40">{m.sender?.username || 'Unknown'}: </span>
                  {getMessagePreview(m)}
                </div>
              </button>
            ))
          )
        )}
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Calls</h3>
          <Dialog open={isNewCallOpen} onOpenChange={setIsNewCallOpen}>
            <DialogTrigger asChild>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl messenger-input text-xs text-[#6b7280] hover:text-white transition-colors">
                <Video size={12} />
                New meet
              </button>
            </DialogTrigger>
            <DialogContent className="messenger-panel border-white/10">
              <DialogHeader>
                <DialogTitle>Start Call</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Search users to call..."
                  value={userSearchQuery}
                  onChange={(e) => {
                    setUserSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  className="messenger-input border-white/10"
                />
                {isSearching && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="animate-spin" />
                  </div>
                )}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleStartCall(u.id)}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <AvatarImage
                          src={u.avatar}
                          alt={u.username}
                          className="w-full h-full rounded-full"
                          fallback={<span className="text-white font-semibold">{u.username.charAt(0).toUpperCase()}</span>}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{u.username}</p>
                        <p className="text-xs text-[#6b7280]">
                          {u.is_online ? 'Online' : 'Offline'}
                        </p>
                      </div>
                      <div className="p-2 rounded-full bg-primary/20 text-primary">
                        <Phone size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-1">
          {callStatus.isActive && activeCallChat ? (
            <div
              onClick={() => setActiveChat(activeCallChat)}
              className="flex items-center gap-3 p-2 rounded-xl bg-green-500/10 border border-green-500/20 cursor-pointer animate-pulse"
            >
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                <Phone size={16} />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{activeCallName}</p>
                <p className="text-xs text-green-400">Call in progress...</p>
              </div>
              {callStatus.isIncoming && (
                <button onClick={(e) => { e.stopPropagation(); joinCall(); }} className="px-2 py-1 rounded bg-green-600 text-white text-xs">
                  Join
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-[#6b7280] text-xs">
              No active calls
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
