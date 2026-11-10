import type { SessionUser } from './auth';

/** A roster code identifies a person but does not establish supervisor status. */
export function departmentAccess(user: SessionUser | null): 'staff' | 'supervisor' | null {
  if (!user || user.role === 'admin') return null;
  if (/^supervisor-\d+@units\.invalid$/i.test(user.email)) return 'supervisor';
  if (/^department-\d+@units\.invalid$/i.test(user.email)) return 'staff';
  if (/^roster-\d+@staff\.invalid$/i.test(user.email)) return 'staff';
  return null;
}
