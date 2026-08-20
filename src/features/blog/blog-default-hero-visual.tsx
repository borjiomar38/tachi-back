import heroBackground from '@/features/auth/layout-login-background.webp';
import heroCharacter from '@/features/auth/layout-login-character.webp';

export const BlogDefaultHeroVisual = () => (
  <>
    <img
      src={heroBackground}
      alt=""
      width={1_536}
      height={1_024}
      loading="eager"
      decoding="async"
      fetchPriority="high"
      className="absolute inset-0 -z-20 size-full object-cover object-[62%_center] opacity-45"
    />
    <div className="absolute inset-0 -z-10 bg-linear-to-r from-neutral-950 via-neutral-950/88 to-neutral-950/42" />
    <div className="absolute inset-0 -z-10 bg-linear-to-t from-neutral-950/45 via-transparent to-neutral-950/15" />
    <div className="pointer-events-none absolute inset-y-0 right-[max(1rem,calc((100vw-72rem)/2))] hidden w-[min(24rem,34vw)] items-center justify-center md:flex">
      <img
        src={heroCharacter}
        alt=""
        width={1_024}
        height={1_536}
        loading="eager"
        decoding="async"
        className="animate-float-in-space max-h-[calc(100%-6rem)] w-full object-contain opacity-92 drop-shadow-[0_30px_56px_rgba(0,0,0,0.55)]"
      />
    </div>
  </>
);
