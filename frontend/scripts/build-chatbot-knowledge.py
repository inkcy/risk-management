import os,glob,hashlib,json,zipfile,re,sys,fitz,openpyxl
from pptx import Presentation
from docx import Document
from bs4 import BeautifulSoup
p=sys.argv[1]; out=[]; seen=set(); report=[]
def add(title,loc,text):
 text=re.sub(r'[\t\r ]+',' ',text);text=re.sub(r'\n\s*\n+','\n',text).strip()
 if len(text)<20:return
 # Preserve source location when a page is unusually long.
 while len(text)>1800:
  at=text.rfind(' ',600,1800);at=at if at>600 else 1800
  out.append({'source':title,'location':loc,'text':text[:at]});text=text[at:].strip()
 if len(text)>=20:out.append({'source':title,'location':loc,'text':text})
keys=['Safety Goals 2018','human factors _ human center design','HA Forum 260311','EBook_aw_simple2','0000000104-RCA','บัญชีอุบัติการณ์ความเสี่ยงระบบ_NRLS','คู่มือการใช้งานระบบ_HRMS','Copy of Day2.2']
files=[f for f in glob.glob(p+'\\*.pdf') if os.path.basename(f).startswith('Day') or any(x in os.path.basename(f) for x in keys)]
for f in sorted(files):
 h=hashlib.sha256(open(f,'rb').read()).hexdigest()
 if h in seen:continue
 seen.add(h);d=fitz.open(f);before=len(out)
 for i,page in enumerate(d):add(os.path.basename(f),f'หน้า {i+1}',page.get_text(sort=True))
 report.append((os.path.basename(f),len(d),len(out)-before))
if len(sys.argv) > 2:
 d=fitz.open(sys.argv[2]);before=len(out)
 for i,page in enumerate(d):add('สปสช. เอกสาร 2565 COSO ERM 2017',f'หน้า {i+1}',page.get_text(sort=True))
 report.append(('สปสช. เอกสาร 2565 COSO ERM 2017',len(d),len(out)-before))
for n in ['Risk.pptx','Day 2_1 RCA 5Tier 601.pptx']:
 deck=Presentation(os.path.join(p,n));before=len(out)
 for i,slide in enumerate(deck.slides):
  parts=[]
  for shape in slide.shapes:
   if shape.has_text_frame:parts.append(shape.text)
   if shape.has_table:parts.extend(' | '.join(cell.text for cell in row.cells) for row in shape.table.rows)
  add(n,f'สไลด์ {i+1}','\n'.join(parts))
 report.append((n,len(deck.slides),len(out)-before))
n='คำถามเพื่อการสืบสอบ 5 Tier Contributory Factor for Incident Analysis.zip'
with zipfile.ZipFile(os.path.join(p,n)) as z:
 s=BeautifulSoup(z.read(z.namelist()[0]),'html.parser')
 for item in s(['script','style','nav','footer']):item.decompose()
 add(n,'เอกสาร HTML',s.get_text('\n',strip=True))
n='แบบฟอร์มแสดงการวิเคราะห์สาเหตุที่แท้จริ.docx';d=Document(os.path.join(p,n));parts=[x.text for x in d.paragraphs]
for table in d.tables:
 parts.extend(' | '.join(cell.text for cell in row.cells) for row in table.rows)
add(n,'แบบฟอร์ม Word','\n'.join(parts))
n='Risk Register 9 ธ.ค.68 แก้risk treatment(1).xlsx';w=openpyxl.load_workbook(os.path.join(p,n),read_only=True,data_only=True)
for s in w:
 rows=[]
 for i,row in enumerate(s.values,1):
  line=' | '.join(str(v).strip() for v in row if v is not None and str(v).strip())
  if line:rows.append((i,line))
 for k in range(0,len(rows),6):
  batch=rows[k:k+6];add(n,f'{s.title} แถว {batch[0][0]}–{batch[-1][0]}','\n'.join(f'แถว {i}: {v}' for i,v in batch))
manual=[
 ('messageImage_1794213586457.jpg','ภาพ','ตอนที่ II ระบบงานสำคัญของโรงพยาบาล\nII-1 การบริหารงานคุณภาพ ความเสี่ยง และความปลอดภัย\nII-2 การกำกับดูแลด้านวิชาชีพ\nII-3 สิ่งแวดล้อมในการดูแลผู้ป่วย/ผู้รับผลงาน\nII-4 การป้องกันและควบคุมการติดเชื้อ\nII-5 ระบบเวชระเบียน\nII-6 ระบบการจัดการด้านยา\nII-7 การตรวจทดสอบเพื่อการวินิจฉัยโรคและบริการที่เกี่ยวข้อง\nII-8 การเฝ้าระวังโรคและภัยสุขภาพ\nII-9 การทำงานกับชุมชน\nII-10 การดูแลผู้ป่วยด้วยเทคโนโลยีดิจิทัล'),
 ('messageImage_1794213718092.jpg','ภาพ','องค์กรทำให้มั่นใจว่ามีระบบบริหารความเสี่ยงและความปลอดภัยที่มีประสิทธิผลและประสานสอดคล้องกัน เพื่อจัดการความเสี่ยงและสร้างความปลอดภัยแก่ผู้ป่วย/ผู้รับผลงาน บุคลากรและผู้มาเยือน\nกระบวนการ RM\nระบุ วิเคราะห์ มาตรการปฏิบัติ ติดตามและทบทวน ทะเบียนจัดการความเสี่ยง\nการจัดการอุบัติการณ์ที่ได้ผล\nการรายงาน การสืบค้น การวิเคราะห์สาเหตุ (RCA) การปรับปรุง การสื่อสาร การฝึกอบรม การช่วยเหลือบุคลากรที่ได้รับผลกระทบ'),
 ('1794213933107.jpg','ภาพ','องค์กรทำให้เชื่อมั่นว่ามีการบริหารงานคุณภาพที่ประสานสอดคล้องกันในทุกระดับ และพัฒนาคุณภาพการดูแลผู้ป่วยอย่างเป็นองค์รวมเหมาะสม และได้ผล\nการประสานงานและบูรณาการ QM, RM, safety\nการทำงานเป็นทีม\nการประเมินตนเอง\nทบทวนและชี้นำการพัฒนา\nจัดทำแผนพัฒนาคุณภาพ\nนำแผนพัฒนาไปดำเนินการ\nเผยแพร่ข้อมูลผลการดำเนินการขององค์กรและบริการ'),
 ('แนวทางตรวจ_Anti-HIV_หญิงตั้งครรภ์(1).png','ภาพ','แนวทางแก้ไขและเรียนรู้: การตรวจยืนยันและการรายงานผล Anti-HIV ในหญิงตั้งครรภ์\nวางระบบขั้นตอน Screening 1st ANC สำหรับ Lab 1 และ Lab 2 พร้อมกระบวนการแจ้งผลให้ชัดเจน\nวางระบบติดตามเจาะเลือด Retest ซ้ำ\nส่งต่อรายชื่อติดตามผลภายใน 2 สัปดาห์\nตรวจเช็คผลเลือดครบถ้วนก่อนแจ้ง\nระบุ “มี Lab ค้างฟังผล” หน้าสมุด ANC\nทำ Pre/Post Counseling ทุกครั้ง')
]
for a,b,c in manual:
 for line in c.split('\n'):add(a,'ภาพ (ถอดข้อความ)',line)
target=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'chatbot-knowledge.json'); os.makedirs(os.path.dirname(target),exist_ok=True)
with open(target,'w',encoding='utf8') as f:json.dump(out,f,ensure_ascii=False,separators=(',',':'))
print('CHUNKS',len(out),'SOURCES',len(set(x['source'] for x in out)),'BYTES',os.path.getsize(target))
for n,pages,chunks in report:
 if chunks==0 or chunks/pages<0.4:print('PARTIAL',n,pages,chunks)
