import { X, Users, MessageCircle, Bell, BellOff, Image, File, Mic, Link, UserPlus, Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useMessenger } from '@/context/MessengerContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

type MediaTab = 'media' | 'files' | 'voice' | 'links';

export const GroupInfo = () => {
  const { user } = useAuth();
  const { activeChat, messages, setShowChatInfo, getChatDisplayName, getChatAvatar, getOtherUser, createDirectChat } = useMessenger();
  const [activeMediaTab, setActiveMediaTab] = useState<MediaTab>('media');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { createInvite, muteChat } = useMessenger();

  useEffect(() => {
    if (!activeChat) return;
    setNotificationsEnabled(!activeChat.muted);
  }, [activeChat]);

  if (!activeChat) return null;

  const mediaMessages = messages.filter(m => m.message_type === 'image' || m.message_type === 'video');
  const fileMessages = messages.filter(m => m.message_type === 'file');
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

  const handleCreateInvite = async () => {
    try {
      const { code } = await createInvite(activeChat.id);
      setInviteCode(code);
    } catch (e) {
      console.error('Failed to create invite:', e);
    }
  };

  const copyInvite = () => {
    if (!inviteCode) return;
    const link = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mediaTabs: { key: MediaTab; label: string }[] = [
    { key: 'media', label: 'Media' },
    { key: 'files', label: 'Files' },
    { key: 'voice', label: 'Voice' },
    { key: 'links', label: 'Links' },
  ];

  return (
    <div className="w-[320px] xl:w-[360px] 2xl:w-[400px] messenger-panel border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300">
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
                  {activeChat.members?.length || 0} Members {'\u2022'} <span className="text-green-500">{onlineMembers} Online</span>
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
            No description available.
          </p>
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-center justify-between py-3 border-t border-b border-white/10">
          <span className="text-sm text-white">Notifications</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newState = !notificationsEnabled;
                setNotificationsEnabled(newState);
                muteChat(activeChat.id, !newState);
              }}
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

        {activeChat.is_group && (
          <div className="mt-4">
            {!inviteCode ? (
              <button
                onClick={handleCreateInvite}
                className="w-full py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
              >
                <UserPlus size={18} />
                Invite to Group
              </button>
            ) : (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider font-bold">Invite Code</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/20 p-2 rounded text-primary text-sm font-mono tracking-widest">{inviteCode}</code>
                  <button
                    onClick={copyInvite}
                    className="p-2 hover:bg-primary/20 text-primary rounded-lg transition-all"
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
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
                  {msg.message_type === 'video' ? (
                    <video src={msg.file_url || msg.content} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={msg.content} alt="Shared media" className="w-full h-full object-cover" />
                  )}
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
          fileMessages.length > 0 ? (
            <div className="space-y-2">
              {fileMessages.map((msg) => (
                <div key={msg.id} className="bg-white/5 p-3 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <File size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-white truncate font-medium">{msg.content.split('/').pop() || 'File'}</span>
                      <span className="text-[10px] text-[#6b7280] ml-2">{new Date(msg.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#6b7280]">{msg.sender?.username}</span>
                      <a
                        href={msg.file_url || msg.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-[#6b7280]">
              <File size={32} className="mb-2" />
              <p className="text-sm">No files shared</p>
            </div>
          )
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
