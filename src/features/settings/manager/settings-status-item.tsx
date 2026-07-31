import { cn } from '@/lib/tailwind/utils';

interface SettingsStatusItemProps {
  icon?: React.ReactNode;
  label: string;
  positive?: boolean;
  value: string;
}

export const SettingsStatusItem = ({
  icon,
  label,
  positive = false,
  value,
}: SettingsStatusItemProps) => (
  <div className="flex min-h-24 items-center gap-3 p-5">
    {icon ? <span className="text-muted-foreground">{icon}</span> : null}
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 truncate font-medium',
          positive && 'text-positive-600'
        )}
      >
        {value}
      </p>
    </div>
  </div>
);
