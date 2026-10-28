'use client';

import { useEffect, useState } from 'react';

type Role = 'admin' | 'editor' | 'viewer';

interface ManagedUser {
  id: number;
  email: string;
  name: string | null;
  role: Role;
  active: boolean;
  last_login_at: string | null;
}

const ROLE_LABEL: Record<Role, string> = {
  admin: 'ผู้ดูแลระบบ',
  editor: 'ผู้กรอกข้อมูล',
  viewer: 'ผู้ดูอย่างเดียว',
};

export function UserAdmin({ currentUserId }: { currentUserId: number }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users')
      .then(async r => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
        return body;
      })
      .then(body => setUsers(body.users))
      .catch(err => setError(String(err.message ?? err)))
      .finally(() => setLoading(false));
  }, []);

  async function update(id: number, patch: { role?: Role; active?: boolean }) {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      setUsers(list => list.map(u => (u.id === id ? body.user : u)));
    } catch (err) {
      setError(String((err as Error).message ?? err));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div style={{ fontSize: 15, color: 'var(--text2)' }}>กำลังโหลดรายชื่อผู้ใช้…</div>;

  return (
    <div>
      {error && (
        <div style={{
          background: 'rgba(220,60,60,0.12)', border: '1px solid rgba(220,60,60,0.35)',
          color: '#ff8f8f', borderRadius: 8, padding: '9px 12px', fontSize: 14.4, marginBottom: 12,
        }}>
          {error}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, minWidth: 520 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text2)', fontSize: 13.8 }}>
              <th style={{ padding: '8px 6px' }}>ผู้ใช้</th>
              <th style={{ padding: '8px 6px' }}>สิทธิ์</th>
              <th style={{ padding: '8px 6px' }}>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 6px' }}>
                    <div>{u.name ?? '—'}{isSelf && <span style={{ color: 'var(--text3)' }}> (คุณ)</span>}</div>
                    <div style={{ color: 'var(--text3)', fontSize: 13.2 }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '10px 6px' }}>
                    <select
                      value={u.role}
                      disabled={isSelf || busyId === u.id}
                      onChange={e => update(u.id, { role: e.target.value as Role })}
                      style={{ fontSize: 14.4, padding: '5px 7px' }}
                    >
                      {(Object.keys(ROLE_LABEL) as Role[]).map(r => (
                        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '10px 6px' }}>
                    <button
                      type="button"
                      className="tb-btn tb-btn-ghost"
                      disabled={isSelf || busyId === u.id}
                      onClick={() => update(u.id, { active: !u.active })}
                      style={{ fontSize: 13.8 }}
                    >
                      {u.active ? '✓ ใช้งานได้' : '✕ ถูกระงับ'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 13.2, color: 'var(--text3)', marginTop: 14, lineHeight: 1.7 }}>
        ผู้ที่เข้าสู่ระบบครั้งแรกจะได้สิทธิ์ <strong>ผู้ดูอย่างเดียว</strong> เสมอ ต้องเลื่อนเป็น
        <strong> ผู้กรอกข้อมูล</strong> ถึงจะบันทึกอุบัติการณ์และข้อมูลผู้ป่วยได้
        · การระงับบัญชีจะตัด session ที่ค้างอยู่ทันที
      </p>
    </div>
  );
}
