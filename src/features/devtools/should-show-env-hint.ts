const productionEnvNames = new Set(['prod', 'production']);

export const shouldShowEnvHint = (envName?: string) => {
  const normalizedEnvName = envName?.trim().toLowerCase();

  return Boolean(
    normalizedEnvName && !productionEnvNames.has(normalizedEnvName)
  );
};
