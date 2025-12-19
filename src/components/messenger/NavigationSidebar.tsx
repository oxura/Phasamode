import { Home, Search, Bookmark, Trash2, Share2, Settings, Moon, Sun, LogOut, User, Camera, Loader2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useMessenger } from '@/context/MessengerContext';
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { PhaseLogo } from '@/components/PhaseLogo';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  showLabel?: boolean;
}

const NavItem = ({ icon, label, isActive, onClick, showLabel = true }: NavItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      'flex flex-col items-center gap-1.5 py-3 w-full transition-all duration-200',
      isActive
        ? 'text-primary'
        : 'text-[#6b7280] hover:text-foreground'
    )}
  >
    {icon}
    {showLabel && <span className="text-[10px] font-medium">{label}</span>}
  </button>
);

export const NavigationSidebar = ({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) => {
  const { user, logout, updateUser } = useAuth();
  const { createDirectChat, setActiveChat, activeView, setActiveView } = useMessenger();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; avatar: string | null; is_online: boolean }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setEditUsername(user.username);
      setEditAvatar(user.avatar || '');
    }
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
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

  const handleSaveProfile = async () => {
    if (!editUsername.trim()) return;
    setIsSaving(true);
    try {
      const updated = await api.updateProfile({ username: editUsername, avatar: editAvatar || undefined });
      updateUser(updated);
      toast.success('Profile updated');
      setIsProfileOpen(false);
    } catch (e) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const { url } = await api.uploadFile(file);
      setEditAvatar(url);
      toast.success('Avatar uploaded');
    } catch (err) {
      toast.error('Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleNavClick = (label: string) => {
    if (label === 'Home') setActiveView('home');
    else if (label === 'Search') setIsSearchOpen(true);
    else if (label === 'Saves') setActiveView('saves');
    else if (label === 'Trash') setActiveView('trash');
    else if (label === 'Settings') setIsSettingsOpen(true);
    else if (label === 'Share') setActiveView('share');
  };

  const navItems = [
    { icon: <Home size={20} />, label: 'Home' },
    { icon: <Search size={20} />, label: 'Search' },
    { icon: <Bookmark size={20} />, label: 'Saves' },
    { icon: <Trash2 size={20} />, label: 'Trash' },
    { icon: <Share2 size={20} />, label: 'Share' },
    { icon: <Settings size={20} />, label: 'Settings' },
  ];

  if (variant === 'mobile') {
    return (
      <>
        <div className="w-full h-16 messenger-panel flex items-center justify-around border-t border-white/10 px-2">
          {navItems.slice(0, 5).map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.label)}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-xl transition-colors',
                (item.label === 'Home' && activeView === 'home') ||
                  (item.label === 'Saves' && activeView === 'saves') ||
                  (item.label === 'Trash' && activeView === 'trash') ||
                  (item.label === 'Share' && activeView === 'share')
                  ? 'text-primary bg-white/5'
                  : 'text-[#6b7280] hover:text-foreground'
              )}
            >
              {item.icon}
            </button>
          ))}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-orange-500 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-semibold text-xs">{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
            )}
          </button>
        </div>

        {/* Dialogs are shared between variants */}
        <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
          <DialogContent className="messenger-panel border-white/10">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    {editAvatar ? (
                      <img src={editAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} className="text-white" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 size={16} className="text-primary-foreground animate-spin" />
                    ) : (
                      <Camera size={16} className="text-primary-foreground" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{user?.email}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username-mobile">Username</Label>
                  <Input
                    id="username-mobile"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="messenger-input border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Avatar</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar ? 'Uploading...' : 'Upload from gallery'}
                  </Button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                </div>
              </div>

              <Button onClick={handleSaveProfile} className="w-full" disabled={isSaving || !editUsername.trim()}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="messenger-panel border-white/10">
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg messenger-input border-white/10">
                <div className="flex items-center gap-3">
                  {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                  <span>Dark Mode</span>
                </div>
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors relative',
                    isDarkMode ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform',
                    isDarkMode ? 'translate-x-6' : 'translate-x-0.5'
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg messenger-input border-white/10">
                <div className="flex items-center gap-3">
                  <User size={20} />
                  <span>Account</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setIsSettingsOpen(false); setIsProfileOpen(true); }}>
                  Edit
                </Button>
              </div>

              <Button variant="destructive" className="w-full" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <DialogContent className="messenger-panel border-white/10">
            <DialogHeader>
              <DialogTitle>Search Users</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
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
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
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
                      <p className="text-xs text-muted-foreground">
                        {u.is_online ? <span className="text-green-500">Online</span> : 'Offline'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          const chat = await createDirectChat(u.id);
                          setActiveChat(chat);
                          setIsSearchOpen(false);
                          setSearchQuery('');
                          setSearchResults([]);
                          toast.success(`Chat with ${u.username} opened`);
                        } catch (e) {
                          toast.error('Failed to create chat');
                        }
                      }}
                    >
                      <MessageCircle size={16} />
                    </Button>
                  </div>
                ))}
                {!isSearching && searchQuery && searchResults.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">No users found</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="w-[88px] messenger-panel flex flex-col items-center py-5 border-r border-white/10">
        <div className="flex flex-col items-center mb-6">
          <div className="w-10 h-10 flex items-center justify-center">
            <PhaseLogo className="w-10 h-10 drop-shadow-[0_0_12px_rgba(244,240,230,0.35)]" />
          </div>
          <span className="text-[10px] mt-2 text-white/60 font-semibold tracking-[0.2em]">PHASE</span>
        </div>

        <nav className="flex flex-col items-center flex-1 w-full">
          {navItems.map((item) => (
            <NavItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              showLabel
              isActive={
                (item.label === 'Home' && activeView === 'home') ||
                (item.label === 'Saves' && activeView === 'saves') ||
                (item.label === 'Trash' && activeView === 'trash') ||
                (item.label === 'Share' && activeView === 'share')
              }
              onClick={() => handleNavClick(item.label)}
            />
          ))}
        </nav>

        <div className="flex flex-col items-center gap-3 mt-auto">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 rounded-lg text-[#6b7280] hover:text-foreground transition-all"
            title={isDarkMode ? 'Light mode' : 'Dark mode'}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={logout}
            className="p-2.5 rounded-lg text-[#6b7280] hover:text-destructive transition-all"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
          <button
            onClick={() => setIsProfileOpen(true)}
            className="w-10 h-10 rounded-full overflow-hidden mt-2 ring-2 ring-orange-500 transition-all cursor-pointer bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-semibold">{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
            )}
          </button>
        </div>
      </div>

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="messenger-panel border-white/10">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  {editAvatar ? (
                    <img src={editAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} className="text-white" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90"
                >
                  {isUploadingAvatar ? (
                    <Loader2 size={16} className="text-primary-foreground animate-spin" />
                  ) : (
                    <Camera size={16} className="text-primary-foreground" />
                  )}
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{user?.email}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="messenger-input border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>Avatar</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? 'Uploading...' : 'Upload from gallery'}
                </Button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
              </div>
            </div>

            <Button onClick={handleSaveProfile} className="w-full" disabled={isSaving || !editUsername.trim()}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="messenger-panel border-white/10">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg messenger-input border-white/10">
              <div className="flex items-center gap-3">
                {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                <span>Dark Mode</span>
              </div>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={cn(
                  'w-12 h-6 rounded-full transition-colors relative',
                  isDarkMode ? 'bg-primary' : 'bg-muted'
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform',
                  isDarkMode ? 'translate-x-6' : 'translate-x-0.5'
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg messenger-input border-white/10">
              <div className="flex items-center gap-3">
                <User size={20} />
                <span>Account</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setIsSettingsOpen(false); setIsProfileOpen(true); }}>
                Edit
              </Button>
            </div>

            <Button variant="destructive" className="w-full" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="messenger-panel border-white/10">
          <DialogHeader>
            <DialogTitle>Search Users</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
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
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
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
                    <p className="text-xs text-muted-foreground">
                      {u.is_online ? <span className="text-green-500">Online</span> : 'Offline'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        const chat = await createDirectChat(u.id);
                        setActiveChat(chat);
                        setIsSearchOpen(false);
                        setSearchQuery('');
                        setSearchResults([]);
                        toast.success(`Chat with ${u.username} opened`);
                      } catch (e) {
                        toast.error('Failed to create chat');
                      }
                    }}
                  >
                    <MessageCircle size={16} />
                  </Button>
                </div>
              ))}
              {!isSearching && searchQuery && searchResults.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">No users found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
