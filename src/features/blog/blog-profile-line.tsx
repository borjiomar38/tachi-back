interface BlogProfileLineProps {
  label: string;
  value: string;
}

export const BlogProfileLine = ({ label, value }: BlogProfileLineProps) => {
  return (
    <div className="rounded-xl border border-border/70 bg-background/55 px-3 py-3">
      <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
};
