import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

interface AvatarImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallback: React.ReactNode;
}

const normalizeAvatarSrc = (src?: string | null) => {
  if (!src) return null;
  let normalized = src.trim();
  if (!normalized) return null;
  if (normalized.includes('localhost') || normalized.includes('127.0.0.1')) return null;
  if (normalized.startsWith('http://phase-messenger-api.onrender.com')) {
    normalized = normalized.replace('http://phase-messenger-api.onrender.com', 'https://phase-messenger-api.onrender.com');
  }
  return normalized;
};

export const AvatarImage = ({ src, alt, className, fallback }: AvatarImageProps) => {
  const [hasError, setHasError] = useState(false);
  const normalized = useMemo(() => normalizeAvatarSrc(src), [src]);

  if (!normalized || hasError) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={normalized}
      alt={alt}
      className={cn('object-cover', className)}
      onError={() => setHasError(true)}
    />
  );
};
