import type { PermissionCode, UserSession } from '../types'

type JwtPayload = {
  sub?: string
  role?: string
  agenceId?: number
  permissions?: PermissionCode[]
  exp?: number
}

export function parseJwt(token: string): UserSession {
  const [, payload] = token.split('.')
  const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as JwtPayload

  return {
    token,
    email: decoded.sub ?? '',
    role: decoded.role ?? 'INCONNU',
    agenceId: decoded.agenceId,
    permissions: decoded.permissions ?? [],
  }
}
