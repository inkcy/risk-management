'use client';

import { ChangeEvent, useEffect, useState } from 'react';

type Announcement = {
  id: number;
  title: string | null;
  image_data: string;
  created_at: string;
  author_name: string | null;
};

const MAX_FILE_BYTES = 3 * 1024 * 1024;

export function Announcements({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [imageData, setImageData] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/announcements')
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? 'ไม่สามารถโหลดประกาศได้');
        return body.announcements as Announcement[];
      })
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  function pickImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(null);
    setImageData('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_FILE_BYTES) {
      setError('เลือกได้เฉพาะ JPG, PNG หรือ WebP ขนาดไม่เกิน 3 MB');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageData(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  }

  async function publish() {
    if (!imageData) {
      setError('กรุณาเลือกรูปประกาศ');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/announcements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, image_data: imageData }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'ไม่สามารถเผยแพร่ประกาศได้');
      setItems(current => [body.announcement as Announcement, ...current]);
      setTitle(''); setImageData(''); setShowForm(false);
    } catch (publishError) {
      setError((publishError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm('ต้องการลบประกาศนี้ใช่หรือไม่?')) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/announcements?id=${id}`, { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'ไม่สามารถลบประกาศได้');
      setItems(current => current.filter(item => item.id !== id));
    } catch (removeError) {
      setError((removeError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card announcements-card">
      <div className="card-header">
        <div>
          <div className="card-title">📣 ประชาสัมพันธ์</div>
          <div className="announcement-subtitle">ข่าวสารและประกาศสำหรับสมาชิก</div>
        </div>
        {isAdmin && (
          <button type="button" className="tb-btn tb-btn-primary" onClick={() => { setShowForm(value => !value); setError(null); }}>
            {showForm ? 'ปิด' : '+ โพสต์ประกาศ'}
          </button>
        )}
      </div>
      <div className="card-body">
        {showForm && isAdmin && (
          <div className="announcement-form">
            <label>หัวข้อประกาศ (ไม่บังคับ)<input type="text" value={title} maxLength={180} onChange={event => setTitle(event.target.value)} placeholder="เช่น ขอเชิญเข้าร่วมกิจกรรม" /></label>
            <label>รูปประกาศ<input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickImage} /></label>
            {imageData && <img className="announcement-preview" src={imageData} alt="ตัวอย่างรูปประกาศ" />}
            {error && <div className="announcement-error">{error}</div>}
            <button type="button" className="tb-btn tb-btn-primary" disabled={busy} onClick={publish}>{busy ? 'กำลังเผยแพร่…' : 'เผยแพร่ประกาศ'}</button>
          </div>
        )}
        {!showForm && error && <div className="announcement-error">{error}</div>}
        {loading ? <div className="announcement-empty">กำลังโหลดประกาศ…</div> : items.length === 0 ? (
          <div className="announcement-empty">ยังไม่มีประกาศในขณะนี้</div>
        ) : (
          <div className="announcement-grid">
            {items.map(item => (
              <article key={item.id} className="announcement-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image_data} alt={item.title || 'รูปประกาศประชาสัมพันธ์'} />
                <div className="announcement-meta">
                  <div><strong>{item.title || 'ประกาศประชาสัมพันธ์'}</strong><span>{new Date(item.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                  {isAdmin && <button type="button" className="announcement-delete" disabled={busy} onClick={() => remove(item.id)} aria-label="ลบประกาศ">ลบ</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
