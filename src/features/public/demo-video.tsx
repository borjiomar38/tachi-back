import { cn } from '@/lib/tailwind/utils';

import { demoVideo } from '@/features/public/download-assets';

interface DemoVideoProps {
  className?: string;
}

export const DemoVideo = (props: DemoVideoProps) => {
  return (
    <div
      className={cn(
        'flex w-full justify-center bg-black px-3 py-4 sm:px-5',
        props.className,
      )}
    >
      <video
        aria-label={demoVideo.label}
        className="aspect-[9/16] max-h-[76vh] w-full max-w-[22rem] rounded-2xl bg-black object-contain shadow-2xl ring-1 ring-white/10"
        controls
        playsInline
        poster={demoVideo.posterUrl}
        preload="metadata"
      >
        <source src={demoVideo.src} type="video/mp4" />
      </video>
    </div>
  );
};
