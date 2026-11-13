"""Index the ten new reference files without modifying the existing corpus.
Usage: python add-chatbot-documents.py DOWNLOADS_DIR WORK_DIR
WORK_DIR must contain slides.pdf rendered from Slide RM (พี่นุ้ย).pptx.
Requires PyMuPDF, python-docx, python-pptx, Pillow and Thai/English Tesseract.
"""
import concurrent.futures, hashlib, io, json, os, re, subprocess, sys, time, zipfile
from pathlib import Path
import fitz
from PIL import Image
from lxml import etree
from pptx import Presentation

root=Path(__file__).resolve().parents[1]
downloads=Path(sys.argv[1]); work=Path(sys.argv[2]); work.mkdir(parents=True,exist_ok=True)
data=root/'data'; ocr_dir=work/'ocr'; ocr_dir.mkdir(exist_ok=True)
files=['บริหารความเสี่ยง อย่างเรียบง่าย สไตล์ สรพ_.pdf','แนวคิดคุณภาพ.pdf','ความเสี่ยงจัดซื้อ_rotated.pdf','กระบวนการจัดการข้อร้องเรียน.docx','Slide RM (พี่นุ้ย).pptx','risk register_ตัวอย่าง.pdf','Red Cross ERM Training v4 010725 (1).pdf','HP-QPS-QSMH-002[08].pdf','HP-PFR-QSMH-003[05] (1).pdf','Anuwat 250521 RCA.pdf']
missing=[name for name in files if not (downloads/name).is_file()]
if missing: raise FileNotFoundError('Missing sources: '+', '.join(missing))
base=json.loads((data/'chatbot-knowledge.json').read_text(encoding='utf8'))
existing={entry['source'] for entry in base}
if any(name in existing for name in files): raise ValueError('A source is already in the base corpus; review duplicates before rebuilding')
records=[]; ocr_records=[]; images={}; jobs=[]
def add(name,loc,text):
 text=re.sub(r'[\t\r ]+',' ',text); text=re.sub(r'\n\s*\n+','\n',text).strip()
 while len(text)>1800:
  at=text.rfind(' ',600,1800);at=at if at>600 else 1800
  if len(text[:at].strip())>=10:records.append({'source':name,'location':loc,'text':text[:at].strip()})
  text=text[at:].strip()
 if len(text)>=10:records.append({'source':name,'location':loc,'text':text})
def render_page(page,name,loc,need_ocr,archive):
 ident=hashlib.sha256((name+'\0'+loc).encode('utf8')).hexdigest()[:24]
 pix=page.get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False)
 image=Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
 if need_ocr:
  pix2=page.get_pixmap(matrix=fitz.Matrix(2,2),alpha=False)
  ocr_image=Image.open(io.BytesIO(pix2.tobytes('png'))).convert('RGB');ocr_image.thumbnail((2200,2200))
  for attempt in range(3):
   try: ocr_image.save(ocr_dir/(ident+'.png'));break
   except OSError:
    if attempt==2:raise
    time.sleep(.5)
  jobs.append((ident,name,loc))
 image.thumbnail((1000,1000));buffer=io.BytesIO();image.save(buffer,format='JPEG',quality=62,optimize=True)
 archive.writestr(ident+'.jpg',buffer.getvalue())
 images[ident]={'file':ident+'.jpg','source':name,'location':loc,'contentType':'image/jpeg'}
archive_path=work/'chatbot-extra-visuals.zip'
with zipfile.ZipFile(archive_path,'w',compression=zipfile.ZIP_STORED) as archive:
 for name in files:
  source=downloads/name
  if source.suffix.lower()=='.pdf':
   with fitz.open(source) as doc:
    for i,page in enumerate(doc):
     loc=f'หน้า {i+1}'; text=page.get_text(sort=True);add(name,loc,text)
     render_page(page,name,loc,(len(text.strip())<40 or bool(re.search(r'[\uE000-\uF8FF\uFFFD\u25A1\uFFFC]|[ก-๛][À-ÿ·][ก-๛]',text))) and bool(page.get_images() or page.get_drawings()),archive)
   print('Indexed',name,flush=True)
  elif source.suffix.lower()=='.docx':
   # Include text inside floating shapes and text boxes, without duplicating nested paragraphs.
   with zipfile.ZipFile(source) as docx: xml=etree.fromstring(docx.read('word/document.xml'))
   namespace={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
   paragraph_tag='{'+namespace['w']+'}p';parts=[]
   for paragraph in xml.xpath('//w:p',namespaces=namespace):
    texts=[]
    for node in paragraph.xpath('.//w:t',namespaces=namespace):
     owner=node.getparent()
     while owner is not None and owner.tag!=paragraph_tag:owner=owner.getparent()
     if owner is paragraph:texts.append(node.text or '')
    if ''.join(texts).strip():parts.append(''.join(texts))
   add(name,'เอกสาร Word','\n'.join(parts))
   with fitz.open(work/'complaints.pdf') as pages:
    if len(pages)!=1:raise ValueError('Map Word references to individual pages before indexing this document')
    render_page(pages[0],name,'เอกสาร Word',True,archive)
  else:
   deck=Presentation(source)
   with fitz.open(work/'slides.pdf') as slides:
    if len(slides)!=len(deck.slides):raise ValueError('Rendered presentation page count differs from slide count')
    for i,(slide,page) in enumerate(zip(deck.slides,slides)):
     parts=[]
     for shape in slide.shapes:
      if shape.has_text_frame and shape.text.strip():parts.append(shape.text)
      if shape.has_table:parts.extend(' | '.join(cell.text for cell in row.cells) for row in shape.table.rows)
     loc=f'สไลด์ {i+1}';add(name,loc,'\n'.join(parts));render_page(page,name,loc,True,archive)
print('OCR pages',len(jobs),flush=True)
env=os.environ.copy();env['OMP_THREAD_LIMIT']='1';env['TESSDATA_PREFIX']=str(Path('D:/Temp/risk-ocr/bin/tessdata'))
tesseract=Path('D:/Temp/risk-ocr/bin/tesseract.exe')
if jobs and not tesseract.exists():raise FileNotFoundError('Thai OCR runtime is missing')
def ocr(job):
 ident,name,loc=job
 result=subprocess.run([str(tesseract),str(ocr_dir/(ident+'.png')),'stdout','-l','tha+eng','--psm','11'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=120,env=env)
 if result.returncode:raise RuntimeError(f'OCR failed: {name} {loc}')
 return ident,name,loc,result.stdout.decode('utf8','replace').strip()
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for done,(ident,name,loc,text) in enumerate(pool.map(ocr,jobs),1):
  for i in range(0,len(text),1600):
   chunk=text[i:i+1600].strip()
   if len(chunk)>=15:ocr_records.append({'source':name,'location':loc+' (OCR อาจคลาดเคลื่อน โปรดตรวจภาพ)','text':chunk,'visualId':ident})
  if done%10==0:print('OCR',done,'/',len(jobs),flush=True)
for file,value in [('chatbot-extra.json',records),('chatbot-extra-ocr.json',ocr_records),('chatbot-extra-visuals.json',images)]:
 temp=work/file;temp.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':')),encoding='utf8');os.replace(temp,data/file)
os.replace(archive_path,data/'chatbot-extra-visuals.zip')
print('DONE',len(files),'sources',len(records),'text excerpts',len(ocr_records),'OCR excerpts',len(images),'images',flush=True)
