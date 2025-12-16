import { useState } from 'react';
import { Search, Plus, Users, MessageCircle, Loader2, Phone, Video, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMessenger } from '@/context/MessengerContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ChatTab = 'all' | 'groups' | 'contacts';

interface ChatItemProps {
  chat: {
    id: string;
    name: string | null;
    is_group: boolean;
    avatar: string | null;
    members: { id: string; username: string; avatar: string | null; is_online: boolean }[];
    last_message: { content: string; created_at: string } | null;
  };
  isActive: boolean;
  onClick: () => void;
  displayName: string;
  displayAvatar: string | null;
  isOnline: boolean;
  isVoiceMessage?: boolean;
  unreadCount?: number;
  hasVerified?: boolean;
}

const ChatItem = ({ chat, isActive, onClick, displayName, displayAvatar, isOnline, isVoiceMessage, unreadCount, hasVerified }: ChatItemProps) => {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
          {displayAvatar ? (
            <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-semibold text-lg">{displayName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-transparent" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate text-white">{displayName}</span>
          {hasVerified && (
            <svg className="w-4 h-4 text-primary flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
          )}
        </div>
        <p className={cn(
          "text-xs truncate mt-0.5",
          isVoiceMessage ? "text-green-500" : "text-[#6b7280]"
        )}>
          {isVoiceMessage ? '🎤 Voice message' : chat.last_message?.content || 'No messages yet'}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-[10px] text-[#6b7280]">
          {chat.last_message?.created_at ? formatTime(chat.last_message.created_at) : ''}
        </span>
        {unreadCount && unreadCount > 0 && (
          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
            <span className="text-[10px] text-white font-medium">{unreadCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface CallItemProps {
  name: string;
  avatar: string | null;
  status: string;
  isActive?: boolean;
  hasJoinButton?: boolean;
}

const CallItem = ({ name, avatar, status, isActive, hasJoinButton }: CallItemProps) => (
  <div className={cn(
    'flex items-center gap-3 p-3 rounded-2xl transition-all duration-200',
    isActive ? 'bg-primary' : 'hover:bg-white/5'
  )}>
    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
      {avatar ? (
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-white font-semibold">{name.charAt(0).toUpperCase()}</span>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm text-white truncate">{name}</p>
      <p className={cn(
        "text-xs truncate",
        isActive ? "text-white/80" : "text-[#6b7280]"
      )}>{status}</p>
    </div>
    {isActive ? (
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
          <Phone size={14} className="text-white" />
        </button>
        <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <UserPlus size={14} className="text-white" />
        </button>
      </div>
    ) : hasJoinButton && (
      <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl messenger-input text-xs text-[#6b7280] hover:text-white transition-colors">
        <UserPlus size={12} />
        Join
      </button>
    )}
  </div>
);

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
    getChatDisplayName,
    getChatAvatar,
    getOtherUser,
  } = useMessenger();

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; avatar: string | null; is_online: boolean }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const tabs: { key: ChatTab; label: string }[] = [
    { key: 'all', label: 'All Chats' },
    { key: 'groups', label: 'Groups' },
    { key: 'contacts', label: 'Contacts' },
  ];

  const filteredChats = chats.filter((chat) => {
    const name = getChatDisplayName(chat);
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeChatTab === 'groups') return chat.is_group && matchesSearch;
    if (activeChatTab === 'contacts') return !chat.is_group && matchesSearch;
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

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const getIsOnline = (chat: typeof chats[0]) => {
    if (chat.is_group) return false;
    const other = getOtherUser(chat);
    return other?.is_online || false;
  };

  return (
    <div className="w-[360px] messenger-panel flex flex-col border-r border-white/10 messenger-scrollbar overflow-hidden">
      <div className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" size={16} />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full messenger-input rounded-2xl pl-10 pr-4 py-2.5 text-sm placeholder:text-[#6b7280] focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all text-white"
          />
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white">Messages</h2>
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
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.username} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-white font-semibold">{u.username.charAt(0).toUpperCase()}</span>
                          )}
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
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.username} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-white text-sm">{u.username.charAt(0).toUpperCase()}</span>
                          )}
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
          </div>
        </div>

        <div className="flex gap-2 mb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveChatTab(tab.key)}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                activeChatTab === tab.key
                  ? 'bg-primary text-white'
                  : 'messenger-input text-[#6b7280] hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 messenger-scrollbar">
        {isLoadingChats ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-[#6b7280]" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-8 text-[#6b7280] text-sm">
            {chats.length === 0 ? 'No chats yet. Start a new conversation!' : 'No chats found'}
          </div>
        ) : (
          filteredChats.map((chat, index) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              isActive={activeChat?.id === chat.id}
              onClick={() => setActiveChat(chat)}
              displayName={getChatDisplayName(chat)}
              displayAvatar={getChatAvatar(chat)}
              isOnline={getIsOnline(chat)}
              hasVerified={index === 0}
              isVoiceMessage={index === 0}
              unreadCount={index === 2 ? 9 : index === 4 ? 2 : undefined}
            />
          ))
        )}
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Calls</h3>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl messenger-input text-xs text-[#6b7280] hover:text-white transition-colors">
            <Video size={12} />
            New meet
          </button>
        </div>
        <div className="space-y-1">
          <CallItem
            name="Friendly"
            avatar={null}
            status="Sara is talking..."
            isActive={true}
          />
          <CallItem
            name="Product designers"
            avatar={null}
            status="Raya is talking..."
            hasJoinButton={true}
          />
          <CallItem
            name="Dev Team"
            avatar={null}
            status="Jack is talking..."
            hasJoinButton={true}
          />
          <CallItem
            name="UI design"
            avatar={null}
            status="Baran is talking..."
            hasJoinButton={true}
          />
        </div>
      </div>
    </div>
  );
};
