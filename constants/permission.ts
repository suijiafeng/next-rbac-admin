export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
}
export const rolePageMap = {
  [Role.SUPER_ADMIN]: ['*'],
  [Role.ADMIN]: [
    '/dashboard',
    '/users',
    '/profile',
  ],
  [Role.USER]: [
    '/dashboard',
    '/profile',
  ],
};