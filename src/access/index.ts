import type { Access, FieldAccess, PayloadRequest } from 'payload'

const hasAdminRole = (user: PayloadRequest['user']): boolean => {
  if (!user || typeof user !== 'object' || !('roles' in user)) {
    return false
  }

  const roles = user.roles

  return Array.isArray(roles) && roles.includes('admin')
}

export const isAdmin: Access = ({ req }) => hasAdminRole(req.user)

export const isAdminField: FieldAccess = ({ req }) => hasAdminRole(req.user)

export const publishedOrAdmin: Access = ({ req }) => {
  if (hasAdminRole(req.user)) {
    return true
  }

  return {
    status: {
      equals: 'published',
    },
  }
}
