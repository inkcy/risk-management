'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionUser } from '@/lib/auth';

function initials(user: SessionUser) {
  return (user.name ?? user.email).trim().slice(0, 2).toUpperCase();
}

export function AccountProfile({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? '');
  const [picture, setPicture] = useState(user.picture ?? '');
  const [previewBroken, setPreviewBroken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, picture }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      setName(body.user.name ?? '');
      setPicture(body.user.picture ?? '');
      setPreviewBroken(false);
      setMessage('บันทึกโปรไฟล์เรียบร้อยแล้ว');
      router.refresh();
    } catch (err) {
      setError(String((err as Error).message ?? err));
    } finally {
      setSaving(false);
    }
  }

  const previewUser = { ...user, name: name.trim() || user.name, picture: picture.trim() || null };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header"><div className="card-title">บัญชีของฉัน</div></div>
      <div className="card-body">
        <form onSubmit={save} className="profile-form">
          <div className="profile-preview" aria-label="ตัวอย่างรูปโปรไฟล์">
            {previewUser.picture && !previewBroken ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUser.picture} alt="รูปโปรไฟล์" onError={() => setPreviewBroken(true)} />
            ) : (
              <span>{initials(previewUser)}</span>
            )}
          </div>
          <div className="profile-fields">
            <label className="form-group">
              <span className="form-label">ชื่อที่แสดง</span>
              <input value={name} maxLength={100} placeholder="ชื่อที่ต้องการแสดง" onChange={e => setName(e.target.value)} />
            </label>
            <label className="form-group">
              <span className="form-label">ลิงก์รูปโปรไฟล์</span>
              <input value={picture} inputMode="url" placeholder="https://example.com/profile.jpg" onChange={e => { setPicture(e.target.value); setPreviewBroken(false); }} />
            </label>
            <div className="profile-email">อีเมล: {user.email}</div>
          </div>
          <button type="submit" className="tb-btn tb-btn-primary" disabled={saving}>
            {saving ? 'กำลังบันทึก…' : 'บันทึกโปรไฟล์'}
          </button>
        </form>
        {message && <div className="profile-message success">✓ {message}</div>}
        {error && <div className="profile-message error">✕ {error}</div>}
      </div>
    </div>
  );
}
