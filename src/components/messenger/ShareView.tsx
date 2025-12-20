import { useState } from 'react';
import { useMessenger } from '@/context/MessengerContext';
import { Share2, QrCode, Link, Copy, Check, Users } from 'lucide-react';
import { toast } from 'sonner';

export const ShareView = () => {
    const { joinInvite } = useMessenger();
    const [inviteCode, setInviteCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleJoin = async () => {
        if (!inviteCode.trim()) return;
        setIsLoading(true);
        try {
            await joinInvite(inviteCode.trim());
            setInviteCode('');
            toast.success('Successfully joined the chat');
        } catch (e) {
            toast.error('Invalid or expired invite code');
        } finally {
            setIsLoading(false);
        }
    };

    const copyAppUrl = () => {
        navigator.clipboard.writeText(window.location.origin);
        setCopied(true);
        toast.success('App link copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-black/20 backdrop-blur-xl">
            <div className="p-6 border-b border-white/10 flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg text-primary">
                    <Share2 size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold">Share & Join</h2>
                    <p className="text-sm text-muted-foreground">Invite friends or join new groups</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Join Section */}
                    <div className="messenger-card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/15 rounded-lg text-primary">
                                <Users size={20} />
                            </div>
                            <h3 className="text-lg font-semibold">Join via Invite Code</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Enter a 6-character invite code to join a group chat.
                        </p>
                        <div className="flex gap-2">
                            <input
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                placeholder="E.g. AF42KL"
                                maxLength={6}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all uppercase placeholder:text-white/20"
                            />
                            <button
                                onClick={handleJoin}
                                disabled={isLoading || inviteCode.length < 6}
                                className="px-6 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 shadow-[0_8px_24px_rgba(0,0,0,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isLoading ? 'Joining...' : 'Join'}
                            </button>
                        </div>
                    </div>

                    {/* Share App Section */}
                    <div className="messenger-card p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none rotate-12">
                            <QrCode size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-primary/15 rounded-lg text-primary">
                                    <Link size={20} />
                                </div>
                                <h3 className="text-lg font-semibold">Share Phase</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-6">
                                Share the link to Phase with your friends so they can join you.
                            </p>
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex items-center justify-between gap-4">
                                <span className="text-sm font-mono truncate text-muted-foreground">
                                    {window.location.origin}
                                </span>
                                <button
                                    onClick={copyAppUrl}
                                    className="p-2.5 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 transition-all"
                                >
                                    {copied ? <Check size={20} /> : <Copy size={20} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-xs text-muted-foreground max-w-[280px] mx-auto italic">
                            Invite codes are valid for 7 days and can be used by multiple people.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
