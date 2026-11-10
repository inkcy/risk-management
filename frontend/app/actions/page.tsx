const lessons = [
  { image: '/rca-lesson-catheter.png', title: 'แนวทางการป้องกันการถอดสายสวนหลอดเลือดผิดตำแหน่ง' },
  { image: '/rca-lesson-childbirth.png', title: 'แนวทางแก้ไขและป้องกันสิ่งตกค้างในช่องคลอดหลังการคลอด' },
];

export default function RcaLessonsPage() {
  return <section aria-label="บทเรียนจาก RCA" style={{ display: 'grid', gap: 20 }}>
    {lessons.map(lesson => <article key={lesson.image} className="card" style={{ overflow: 'hidden' }}>
      <div className="card-header">
        <h2 className="card-title">{lesson.title}</h2>
        <a href={lesson.image} target="_blank" rel="noopener noreferrer" className="tb-btn tb-btn-ghost">เปิดภาพขนาดเต็ม</a>
      </div>
      <a href={lesson.image} target="_blank" rel="noopener noreferrer" aria-label={`เปิดภาพขนาดเต็ม ${lesson.title}`}>
        <img src={lesson.image} alt={`อินโฟกราฟิกบทเรียนจาก RCA เรื่อง${lesson.title}`} loading="lazy" style={{ display: 'block', width: '100%', height: 'auto' }} />
      </a>
    </article>)}
  </section>;
}
