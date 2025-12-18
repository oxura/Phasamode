import { NavigationSidebar } from './NavigationSidebar';
import { ChatList } from './ChatList';
import { ChatArea } from './ChatArea';
import { GroupInfo } from './GroupInfo';
import { SavesView } from './SavesView';
import { TrashView } from './TrashView';
import { ShareView } from './ShareView';
import { MessengerProvider } from '@/context/MessengerContext';
import { useMessenger } from '@/context/MessengerContext';

const MessengerLayout = () => {
  const { activeChat, showChatInfo, activeView } = useMessenger();

  return (
    <div className="h-screen w-full messenger-app-bg flex items-center justify-center p-6 overflow-hidden">
      <div className="messenger-shell w-full h-full max-w-[1480px] max-h-[920px] flex overflow-hidden">
        <NavigationSidebar />
        {activeView === 'home' ? (
          <>
            <ChatList />
            <ChatArea />
            {activeChat && showChatInfo && <GroupInfo />}
          </>
        ) : activeView === 'saves' ? (
          <SavesView />
        ) : activeView === 'trash' ? (
          <TrashView />
        ) : activeView === 'share' ? (
          <ShareView />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            View not found
          </div>
        )}
      </div>
    </div>
  );
};

export const MessengerApp = () => {
  return (
    <MessengerProvider>
      <MessengerLayout />
    </MessengerProvider>
  );
};
