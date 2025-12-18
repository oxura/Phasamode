import { useEffect } from 'react';
import { useMessenger } from '@/context/MessengerContext';
import { Bookmark, Search, Trash2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export const SavesView = () => {
    const { saves, fetchSaves, unsaveMessage } = useMessenger();

    useEffect(() => {
        fetchSaves();
    }, [fetchSaves]);

    return (
        <div className="flex-1 flex flex-col h-full bg-black/20 backdrop-blur-xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg text-primary">
                        <Bookmark size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Saved Messages</h2>
                        <p className="text-sm text-muted-foreground">{saves.length} saved items</p>
                    </div>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        placeholder="Search saves..."
                        className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all w-64"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {saves.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                            <Bookmark size={40} className="text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium">No saved messages</h3>
                            <p className="text-muted-foreground text-sm max-w-[250px]">
                                Messages you save will appear here for quick access.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 max-w-4xl mx-auto">
                        {saves.map((msg) => (
                            <div key={msg.id} className="messenger-card group animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-start gap-4 p-4">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
                                        {msg.sender?.avatar ? (
                                            <img src={msg.sender.avatar} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <span className="text-primary font-bold">{msg.sender?.username?.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold text-sm">{msg.sender?.username}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {format(new Date(msg.created_at), 'MMM d, HH:mm')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                                            {msg.content}
                                        </p>
                                        {msg.file_url && (
                                            <div className="mt-2 p-2 bg-white/5 rounded-lg border border-white/10 flex items-center gap-2">
                                                <div className="p-2 bg-primary/20 rounded text-primary">
                                                    <Bookmark size={16} />
                                                </div>
                                                <span className="text-xs truncate">{msg.file_url.split('/').pop()}</span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => unsaveMessage(msg.id)}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive transition-all"
                                        title="Remove from saves"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
