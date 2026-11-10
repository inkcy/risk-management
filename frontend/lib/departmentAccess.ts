import type { SessionUser } from './auth';

/** Department-password accounts are shared staff accounts; roster-code accounts identify their users. */
export function departmentAccess(user: SessionUser | null): 'staff' | 'supervisor' | null {
  if (!user || user.role === 'admin') return null;
  if (/^department-\d+@units\.invalid$/i.test(user.email)) return 'staff';
  if (/^roster-\d+@staff\.invalid$/i.test(user.email)) return 'supervisor';
  return null;
}
