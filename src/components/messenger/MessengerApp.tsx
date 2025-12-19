import { NavigationSidebar } from './NavigationSidebar';
import { ChatList } from './ChatList';
import { ChatArea } from './ChatArea';
import { GroupInfo } from './GroupInfo';
import { SavesView } from './SavesView';
import { TrashView } from './TrashView';
import { ShareView } from './ShareView';
import { MessengerProvider } from '@/context/MessengerContext';
import { useMessenger } from '@/context/MessengerContext';
import { useIsMobile } from '@/hooks/use-mobile';

const MessengerLayout = () => {
  const { activeChat, showChatInfo, activeView } = useMessenger();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen w-screen messenger-app-bg overflow-hidden">
      {isMobile ? (
        <div className="flex flex-col h-screen w-full overflow-hidden">
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            {activeView === 'home' ? (
              activeChat ? (
                <ChatArea />
              ) : (
                <ChatList />
              )
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
          <NavigationSidebar variant="mobile" />
        </div>
      ) : (
        <div className="w-full h-screen flex overflow-hidden">
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
      )}
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
