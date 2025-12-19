import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMessenger } from '@/context/MessengerContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const JoinInvite = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const { joinInvite } = useMessenger();
    const { isAuthenticated, isLoading } = useAuth();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isLoading) return;

        if (!isAuthenticated) {
            navigate(`/login?next=/join/${code}`);
            return;
        }

        const processJoin = async () => {
            if (!code) {
                navigate('/');
                return;
            }

            try {
                await joinInvite(code);
                toast.success('Successfully joined the chat!');
                navigate('/');
            } catch (e: unknown) {
                console.error(e);
                const errorMsg = e instanceof Error ? (e as any).response?.data?.error || e.message : 'Invalid or expired invite code';
                setError(errorMsg);
                toast.error('Failed to join chat');
                setTimeout(() => navigate('/'), 3000);
            }
        };

        processJoin();
    }, [code, joinInvite, navigate, isAuthenticated, isLoading]);

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0b0f] text-white p-4">
                <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl text-center max-w-md w-full backdrop-blur-xl">
                    <h2 className="text-2xl font-bold text-red-400 mb-4">Invite Error</h2>
                    <p className="text-white/60 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all font-medium"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0b0f] text-white">
            <div className="flex flex-col items-center gap-6 animate-pulse">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Joining Chat...</h2>
                    <p className="text-white/40">Please wait while we process your invite code</p>
                </div>
            </div>
        </div>
    );
};

export default JoinInvite;
