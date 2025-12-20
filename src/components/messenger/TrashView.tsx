import { useEffect, useState } from 'react';
import { useMessenger } from '@/context/MessengerContext';
import { Trash2, Search, RotateCcw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AvatarImage } from '@/components/AvatarImage';

export const TrashView = () => {
    const { trash, fetchTrash, restoreMessage, permanentDeleteMessage } = useMessenger();
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchTrash();
    }, [fetchTrash]);

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredTrash = normalizedQuery
        ? trash.filter((msg) => {
            const contentMatch = msg.content?.toLowerCase().includes(normalizedQuery);
            const senderMatch = msg.sender?.username?.toLowerCase().includes(normalizedQuery);
            const chatMatch = msg.chat_name?.toLowerCase().includes(normalizedQuery);
            return contentMatch || senderMatch || chatMatch;
        })
        : trash;

    const handleRestore = async (id: string) => {
        await restoreMessage(id);
        toast.success('Message restored');
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to permanently delete this message?')) {
            await permanentDeleteMessage(id);
            toast.success('Message permanently deleted');
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-black/20 backdrop-blur-xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-destructive/20 rounded-lg text-destructive">
                        <Trash2 size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Trash</h2>
                        <p className="text-sm text-muted-foreground">{filteredTrash.length} deleted items</p>
                    </div>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        placeholder="Search trash..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all w-64"
                    />
                </div>
            </div>

            <div className="p-4 bg-orange-500/10 border-b border-orange-500/20 flex items-center gap-3 text-orange-400 text-sm">
                <AlertCircle size={18} />
                <p>Messages in trash will be automatically deleted after 30 days.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {filteredTrash.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                            <Trash2 size={40} className="text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium">{searchQuery ? 'No matches' : 'Trash is empty'}</h3>
                            <p className="text-muted-foreground text-sm max-w-[250px]">
                                {searchQuery
                                    ? 'Try a different keyword or clear the search.'
                                    : 'Deleted messages will stay here for 30 days before being permanently removed.'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 max-w-4xl mx-auto">
                        {filteredTrash.map((msg) => (
                            <div key={msg.id} className="messenger-card group border-destructive/10">
                                <div className="flex items-start gap-4 p-4">
                                    <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                                        <AvatarImage
                                            src={msg.sender?.avatar}
                                            alt={msg.sender?.username || 'User'}
                                            className="w-full h-full rounded-full opacity-50"
                                            fallback={<span className="text-muted-foreground font-bold">{msg.sender?.username?.charAt(0).toUpperCase()}</span>}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold text-sm text-muted-foreground">{msg.sender?.username}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {format(new Date(msg.created_at), 'MMM d, HH:mm')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-3">
                                            {msg.content}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleRestore(msg.id)}
                                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                                            title="Restore message"
                                        >
                                            <RotateCcw size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(msg.id)}
                                            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                            title="Delete permanently"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
