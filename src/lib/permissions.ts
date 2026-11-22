import type { User } from './auth'

/**
 * Permissions as the API names them (models/roles.go). The panel only uses
 * these to decide what to show; every /api/ops route checks them itself.
 */
export const PERM = {
  blog: 'blog.manage',
  moderation: 'moderation',
  dealerships: 'dealerships.review',
  users: 'users.manage',
  catalog: 'catalog.manage',
} as const

export type Permission = (typeof PERM)[keyof typeof PERM]

export type Role = 'user' | 'editor' | 'moderator' | 'admin'

export const ROLE_LABELS: Record<Role, string> = {
  user: 'Usuario',
  editor: 'Publicador (blog)',
  moderator: 'Moderador',
  admin: 'Administrador',
}

export const ROLES: Role[] = ['user', 'editor', 'moderator', 'admin']

/**
 * What the signed-in account may do. An API that predates permissions only
 * sends the role, so an admin there gets everything and anyone else nothing.
 */
export function permissionsOf(user: User | null | undefined): string[] {
  if (!user) return []
  if (user.permissions) return user.permissions
  return user.role === 'admin' ? Object.values(PERM) : []
}

export function can(user: User | null | undefined, permission: Permission): boolean {
  return permissionsOf(user).includes(permission)
}

/** Whether the account should see the operator panel at all. */
export function isStaff(user: User | null | undefined): boolean {
  return permissionsOf(user).length > 0
}
