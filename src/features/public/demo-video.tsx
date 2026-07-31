import { cn } from '@/lib/tailwind/utils';

import { demoVideo } from '@/features/public/download-assets';

interface DemoVideoProps {
  className?: string;
}

export const DemoVideo = (props: DemoVideoProps) => {
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center gap-3 bg-black px-3 py-4 sm:px-5',
        props.className,
      )}
    >
      <div className="aspect-[9/16] max-h-[76vh] w-full max-w-[22rem] overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
        <iframe
          src={demoVideo.embedUrl}
          title={demoVideo.label}
          className="size-full border-0"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <a
        href={demoVideo.watchUrl}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-medium text-brand-100 underline-offset-4 hover:underline"
      >
        Watch the full tutorial on YouTube
      </a>
    </div>
  );
};
