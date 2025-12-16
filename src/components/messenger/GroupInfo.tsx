import { X, Users, MessageCircle, Bell, BellOff, Image, File, Mic, Link } from 'lucide-react';
import { useState } from 'react';
import { useMessenger } from '@/context/MessengerContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

type MediaTab = 'media' | 'files' | 'voice' | 'links';

const placeholderMedia = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1618172193622-ae2d025f4032?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1604076913837-52ab5629fba9?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=200&h=200&fit=crop',
];

export const GroupInfo = () => {
  const { user } = useAuth();
  const { activeChat, messages, setShowChatInfo, getChatDisplayName, getChatAvatar, getOtherUser, createDirectChat } = useMessenger();
  const [activeMediaTab, setActiveMediaTab] = useState<MediaTab>('media');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  if (!activeChat) return null;

  const mediaMessages = messages.filter(m => m.message_type === 'image');
  const voiceMessages = messages.filter(m => m.message_type === 'audio');
  // Simple regex for links
  const linkMessages = messages.filter(m => m.message_type === 'text' && /https?:\/\/[^\s]+/.test(m.content));

  const displayName = getChatDisplayName(activeChat);
  const displayAvatar = getChatAvatar(activeChat);
  const otherUser = getOtherUser(activeChat);
  const isOnline = activeChat.is_group ? false : otherUser?.is_online || false;
  const onlineMembers = activeChat.members?.filter((m) => m.is_online).length || 0;

  const handleStartDirectChat = async (userId: string) => {
    if (userId === user?.id) return;
    try {
      await createDirectChat(userId);
      setShowChatInfo(false);
    } catch (e) {
      console.error(e);
    }
  };

  const mediaTabs: { key: MediaTab; label: string }[] = [
    { key: 'media', label: 'Media' },
    { key: 'files', label: 'Files' },
    { key: 'voice', label: 'Voice' },
    { key: 'links', label: 'Links' },
  ];

  return (
    <div className="w-[320px] messenger-panel border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <h3 className="font-semibold text-white">Group info</h3>
        <button
          onClick={() => setShowChatInfo(false)}
          className="p-1.5 rounded-xl hover:bg-white/5 transition-colors text-[#6b7280] hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            {displayAvatar ? (
              <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-xl">{displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h4 className="font-semibold text-white">{displayName}</h4>
            <p className="text-xs text-[#6b7280]">
              {activeChat.is_group ? (
                <>
                  {activeChat.members?.length || 0} Members •{' '}
                  <span className="text-green-500">{onlineMembers} Online</span>
                </>
              ) : isOnline ? (
                <span className="text-green-500">Online</span>
              ) : (
                'Offline'
              )}
            </p>
          </div>
        </div>

        {activeChat.description && (
          <p className="text-xs text-[#6b7280] mb-4 leading-relaxed">{activeChat.description}</p>
        )}

        {!activeChat.description && activeChat.is_group && (
          <p className="text-xs text-[#6b7280] mb-4 leading-relaxed">
            In this group, we answer each other's questions and help and support each other in the path of growth.
          </p>
        )}

        <a href="#" className="text-xs text-primary hover:underline block mb-4">@uiux_designers</a>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-center justify-between py-3 border-t border-b border-white/10">
          <span className="text-sm text-white">Notifications</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={cn(
                'w-10 h-5 rounded-full transition-colors relative',
                notificationsEnabled ? 'bg-primary' : 'bg-white/10'
              )}
            >
              <div className={cn(
                'w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform',
                notificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'
              )} />
            </button>
            <button className="p-1.5 rounded-xl hover:bg-white/5 transition-colors">
              {notificationsEnabled ? (
                <Bell size={16} className="text-[#6b7280]" />
              ) : (
                <BellOff size={16} className="text-[#6b7280]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {activeChat.is_group && activeChat.members && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-white">Members</span>
            <div className="flex -space-x-1.5">
              {activeChat.members.slice(0, 4).map((member) => (
                <div
                  key={member.id}
                  className="w-6 h-6 rounded-full overflow-hidden border border-transparent bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
                >
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-[10px]">{member.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              ))}
              {activeChat.members.length > 4 && (
                <div className="w-6 h-6 rounded-full bg-white/8 border border-white/10 flex items-center justify-center">
                  <span className="text-[8px] text-[#6b7280]">+{activeChat.members.length - 4}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 pb-3">
        <div className="flex gap-1 messenger-input p-1 rounded-2xl">
          {mediaTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveMediaTab(tab.key)}
              className={cn(
                'flex-1 px-2 py-1.5 rounded-xl text-xs font-medium transition-all',
                activeMediaTab === tab.key
                  ? 'bg-white/10 text-white'
                  : 'text-[#6b7280] hover:text-white hover:bg-white/5'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 messenger-scrollbar">
        {activeMediaTab === 'media' && (
          mediaMessages.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {mediaMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="aspect-square rounded-xl overflow-hidden bg-white/8 border border-white/10 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(msg.content, '_blank')}
                >
                  <img src={msg.content} alt="Shared media" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-[#6b7280]">
              <Image size={32} className="mb-2" />
              <p className="text-sm">No media shared</p>
            </div>
          )
        )}

        {activeMediaTab === 'files' && (
          <div className="flex flex-col items-center justify-center py-8 text-[#6b7280]">
            <File size={32} className="mb-2" />
            <p className="text-sm">No files shared</p>
          </div>
        )}

        {activeMediaTab === 'voice' && (
          voiceMessages.length > 0 ? (
            <div className="space-y-2">
              {voiceMessages.map((msg) => (
                <div key={msg.id} className="bg-white/5 p-3 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                     <span className="text-xs text-white">{msg.sender?.username}</span>
                     <span className="text-[10px] text-[#6b7280]">{new Date(msg.created_at).toLocaleTimeString()}</span>
                  </div>
                  <audio src={msg.content} controls className="w-full h-8" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-[#6b7280]">
              <Mic size={32} className="mb-2" />
              <p className="text-sm">No voice messages</p>
            </div>
          )
        )}

        {activeMediaTab === 'links' && (
          linkMessages.length > 0 ? (
             <div className="space-y-2">
              {linkMessages.map((msg) => (
                <div key={msg.id} className="bg-white/5 p-3 rounded-xl break-all">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="text-xs text-white">{msg.sender?.username}</span>
                     <span className="text-[10px] text-[#6b7280]">{new Date(msg.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm text-primary underline">{msg.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-[#6b7280]">
              <Link size={32} className="mb-2" />
              <p className="text-sm">No links shared</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};
