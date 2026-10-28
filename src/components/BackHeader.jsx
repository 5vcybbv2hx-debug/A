import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BackHeader({ label = 'Zurück', onBack }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={onBack || (() => navigate(-1))}
      className="-ml-2 mb-3 flex min-h-[44px] select-none items-center gap-1 pr-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      aria-label={label}
    >
      <ChevronLeft className="h-5 w-5" strokeWidth={1.6} />
      {label}
    </button>
  );
}