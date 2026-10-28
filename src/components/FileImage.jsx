import { useEffect, useState } from 'react';
import { Image } from '@/components/ui/image';
import { resolveFile } from '@/lib/files';
import { cn } from '@/lib/utils';

export default function FileImage({ uri, className, fittingType = 'fit', alt = '', placeholder = null }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!uri) {
      setSrc(null);
      return;
    }
    resolveFile(uri)
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [uri]);

  if (!src) {
    return (
      <div className={cn('flex items-center justify-center bg-muted/60', className)}>
        {placeholder || <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/40" />}
      </div>
    );
  }

  return <Image src={src} alt={alt} fittingType={fittingType} className={className} />;
}