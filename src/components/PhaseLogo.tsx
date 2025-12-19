import { cn } from '@/lib/utils';

interface PhaseLogoProps {
  className?: string;
}

export const PhaseLogo = ({ className }: PhaseLogoProps) => {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={cn('text-[#f4f0e6]', className)}
    >
      <polygon
        points="50,5 98,35 80,95 20,95 2,35"
        fill="currentColor"
      />
    </svg>
  );
};
