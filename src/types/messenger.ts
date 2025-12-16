export interface User {
  id: string;
  username: string;
  email?: string;
  avatar: string | null;
  is_online: boolean;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender?: User;
}

export interface Chat {
  id: string;
  name: string | null;
  is_group: boolean;
  avatar: string | null;
  description: string | null;
  members: User[];
  last_message: {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
  } | null;
  created_at?: string;
  updated_at?: string;
}

export type ChatTab = 'all' | 'groups' | 'contacts';
