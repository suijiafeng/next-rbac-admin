const ROLE_PRIORITY = ['SUPER_ADMIN', 'ADMIN', 'USER'] as const;

export type AppRole = (typeof ROLE_PRIORITY)[number];

export function resolveRoleFromNames(roleNames: string[]): AppRole {
  const normalizedNames = roleNames.map((roleName) => roleName.toUpperCase());

  return ROLE_PRIORITY.find((role) => normalizedNames.includes(role)) ?? 'USER';
}
