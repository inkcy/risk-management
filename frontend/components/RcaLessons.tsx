'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { RcaLesson } from '@/lib/rcaLessons';

export function RcaLessons({ lessons, canEdit }: { lessons: RcaLesson[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<RcaLesson | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const years = Array.from(new Set(lessons.flatMap(lesson => lesson.year === null ? [] : [lesson.year]))).sort((a, b) => b - a);
  const visible = lessons.filter(lesson => yearFilter === 'all' || (yearFilter === 'unspecified' ? lesson.year === null : lesson.year === Number(yearFilter)));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const file = fields.get('image');
    setBusy(true); setError('');
    try {
      let image = '';
      if (file instanceof File && file.size) {
        if (file.size > 2 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('กรุณาเลือกรูป JPG, PNG หรือ WebP ไม่เกิน 2 MB');
        image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('อ่านรูปไม่สำเร็จ'));
          reader.readAsDataURL(file);
        });
      }
      const year = String(fields.get('year') ?? '').trim();
      const response = await fetch('/api/rca-lessons', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing?.id, title: fields.get('title'), image, year: year ? Number(year) : null }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'บันทึกไม่สำเร็จ');
      setEditing(null); setAdding(false); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ'); }
    finally { setBusy(false); }
  }

  async function remove(lesson: RcaLesson) {
    if (!window.confirm(`ลบบทเรียน “${lesson.title}” หรือไม่?`)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/rca-lessons?id=${lesson.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'ลบไม่สำเร็จ');
      if (editing?.id === lesson.id) setEditing(null);
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'ลบไม่สำเร็จ'); }
    finally { setBusy(false); }
  }

  return <section aria-label="บทเรียนจาก RCA" style={{ display: 'grid', gap: 20 }}>
    {canEdit && <div><button className="tb-btn tb-btn-primary" type="button" disabled={busy} onClick={() => { setAdding(true); setEditing(null); setError(''); }}>เพิ่มบทเรียน</button></div>}
    <label>ปี พ.ศ. <select value={yearFilter} onChange={event => setYearFilter(event.target.value)}><option value="all">ทุกปี</option>{years.map(year => <option key={year} value={year}>{year}</option>)}{lessons.some(lesson => lesson.year === null) && <option value="unspecified">ไม่ระบุปี</option>}</select></label>
    {canEdit && (adding || editing) && <form key={editing?.id ?? 'new'} className="card survey-form" style={{ padding: 20 }} onSubmit={submit}>
      <h2>{editing ? 'แก้ไขบทเรียน' : 'เพิ่มบทเรียน'}</h2>
      <label>หัวข้อ<input name="title" required maxLength={250} defaultValue={editing?.title ?? ''} /></label>
      <label>ปี พ.ศ. <input name="year" type="number" min={2400} max={2800} defaultValue={editing ? editing.year ?? '' : new Date().getFullYear() + 543} placeholder="ไม่ระบุปี" /></label>
      <label>{editing ? 'เปลี่ยนรูปภาพ (เลือกเมื่อต้องการเปลี่ยน)' : 'รูปภาพ'}<input name="image" type="file" accept="image/png,image/jpeg,image/webp" required={!editing} /></label>
      <p>รองรับ JPG, PNG และ WebP ขนาดไม่เกิน 2 MB</p>
      <div style={{ display: 'flex', gap: 8 }}><button className="tb-btn tb-btn-primary" disabled={busy}>บันทึก</button><button className="tb-btn tb-btn-ghost" type="button" disabled={busy} onClick={() => { setEditing(null); setAdding(false); setError(''); }}>ยกเลิก</button></div>
    </form>}
    {error && <p className="announcement-error" role="alert">{error}</p>}
    {!visible.length && <div className="card" style={{ padding: 20 }}>ไม่มีบทเรียนในปีที่เลือก</div>}
    {visible.map(lesson => <article key={lesson.id} className="card" style={{ overflow: 'hidden' }}>
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
        <h2 className="card-title">{lesson.title} · {lesson.year ?? 'ไม่ระบุปี'}</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href={lesson.image} {...(lesson.image.startsWith('data:') ? { download: `rca-lesson-${lesson.id}` } : { target: '_blank', rel: 'noopener noreferrer' })} className="tb-btn tb-btn-ghost">{lesson.image.startsWith('data:') ? 'ดาวน์โหลดภาพ' : 'เปิดภาพขนาดเต็ม'}</a>
          {canEdit && <><button type="button" className="tb-btn tb-btn-ghost" disabled={busy} onClick={() => { setEditing(lesson); setAdding(false); setError(''); }}>แก้ไข</button><button type="button" className="tb-btn tb-btn-ghost" disabled={busy} onClick={() => remove(lesson)}>ลบ</button></>}
        </div>
      </div>
      <img src={lesson.image} alt={`อินโฟกราฟิกบทเรียนจาก RCA เรื่อง${lesson.title}`} loading="lazy" style={{ display: 'block', width: '100%', height: 'auto' }} />
    </article>)}
  </section>;
}
