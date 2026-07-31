import { Switch } from '@/components/ui/switch';

import { permissionStaff } from '@/features/auth/permissions';
import { WithPermissions } from '@/features/auth/with-permissions';

interface SettingsSwitchRowProps {
  checked: boolean;
  description: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}

export const SettingsSwitchRow = ({
  checked,
  description,
  label,
  onCheckedChange,
}: SettingsSwitchRowProps) => (
  <div className="flex min-h-24 items-center justify-between gap-6 py-5">
    <div className="min-w-0">
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
    <WithPermissions permissions={[permissionStaff.update]}>
      <Switch
        aria-label={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </WithPermissions>
  </div>
);
