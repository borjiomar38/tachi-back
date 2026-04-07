export const UNLIMITED_DEVICE_LIMIT = 0;

export function isUnlimitedDeviceLimit(deviceLimit: number | null | undefined) {
  return deviceLimit === null || deviceLimit === undefined || deviceLimit <= 0;
}
