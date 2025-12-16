import { NavigationSidebar } from './NavigationSidebar';
import { ChatList } from './ChatList';
import { ChatArea } from './ChatArea';
import { GroupInfo } from './GroupInfo';
import { MessengerProvider } from '@/context/MessengerContext';
import { useMessenger } from '@/context/MessengerContext';

const MessengerLayout = () => {
  const { activeChat, showChatInfo } = useMessenger();
  
  return (
    <div className="h-screen w-full messenger-app-bg flex items-center justify-center p-6 overflow-hidden">
      <div className="messenger-shell w-full h-full max-w-[1480px] max-h-[920px] flex overflow-hidden">
        <NavigationSidebar />
        <ChatList />
        <ChatArea />
        {activeChat && showChatInfo && <GroupInfo />}
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
