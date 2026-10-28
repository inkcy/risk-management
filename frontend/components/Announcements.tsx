'use client';

import { ChangeEvent, useEffect, useState } from 'react';

type Announcement = {
  id: number;
  title: string | null;
  image_data: string | null;
  description: string | null;
  publish_at: string;
  created_at: string;
  author_name: string | null;
};

const MAX_FILE_BYTES = 3 * 1024 * 1024;

export function Announcements({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [publishAt, setPublishAt] = useState('');
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
      .catch(err => setError(err.message || 'ไม่สามารถโหลดประกาศได้'))
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
    if (!title.trim() && !description.trim() && !imageData) {
      setError('กรุณาใส่หัวข้อ คำอธิบาย หรือรูปประกาศ');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/announcements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, image_data: imageData, publish_at: publishAt ? new Date(publishAt).toISOString() : null }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'ไม่สามารถเผยแพร่ประกาศได้');
      setItems(current => [body.announcement as Announcement, ...current]);
      setTitle(''); setDescription(''); setPublishAt(''); setImageData(''); setShowForm(false);
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
            <label>หัวข้อ<input type="text" value={title} maxLength={180} onChange={event => setTitle(event.target.value)} placeholder="หัวข้อประกาศ" /></label>
            <label>คำอธิบาย<textarea value={description} maxLength={5000} onChange={event => setDescription(event.target.value)} placeholder="เขียนข่าวสารหรือรายละเอียดที่ต้องการประชาสัมพันธ์..." rows={4} /></label>
            <label>รูปประกาศ (ไม่บังคับ)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickImage} /></label>
            <label>ตั้งเวลาเผยแพร่ (ไม่บังคับ)<input type="datetime-local" value={publishAt} onChange={event => setPublishAt(event.target.value)} /><small>เว้นว่างเพื่อเผยแพร่ทันที · เวลาตามอุปกรณ์ของคุณ</small></label>
            {imageData && <img className="announcement-preview" src={imageData} alt="ตัวอย่างรูปประกาศ" />}
            {error && <div className="announcement-error">{error}</div>}
            <button type="button" className="tb-btn tb-btn-primary" disabled={busy} onClick={publish}>{busy ? 'กำลังบันทึก…' : publishAt && new Date(publishAt).getTime() > Date.now() ? 'ตั้งเวลาโพสต์' : 'เผยแพร่ประกาศ'}</button>
          </div>
        )}
        {!showForm && error && <div className="announcement-error">{error}</div>}
        {loading ? <div className="announcement-empty">กำลังโหลดประกาศ…</div> : items.length === 0 ? (
          <div className="announcement-empty">ยังไม่มีประกาศในขณะนี้</div>
        ) : (
          <div className="announcement-feed">
            {items.map(item => (
              <article key={item.id} className="announcement-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <div className="announcement-meta">
                  <div><strong>{item.author_name || 'ผู้ดูแลระบบ'}</strong><span>{new Date(item.publish_at).getTime() > Date.now() ? 'ตั้งเวลาเผยแพร่ · ' : 'เผยแพร่ · '}{new Date(item.publish_at).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
                  {isAdmin && <button type="button" className="announcement-delete" disabled={busy} onClick={() => remove(item.id)} aria-label="ลบประกาศ">ลบ</button>}
                </div>
                {item.title && <h2 className="announcement-title">{item.title}</h2>}
                {item.description && <p className="announcement-description">{item.description}</p>}
                {item.image_data && <img src={item.image_data} alt={item.title || 'รูปประกาศประชาสัมพันธ์'} />}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
