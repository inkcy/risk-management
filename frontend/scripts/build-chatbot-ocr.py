"""Build OCR excerpts and preview images from the supplied reference material.

Usage: python build-chatbot-ocr.py REPOSITORY_ROOT DOWNLOADS_DIR WORK_DIR
WORK_DIR must contain bin/tesseract.exe with tha+eng trained data, plus slides-0.pdf
(Risk.pptx) and slides-1.pdf (Day 2_1 RCA 5Tier 601.pptx) rendered from PowerPoint.
Requires PyMuPDF and Pillow. Run compact-chatbot-visuals.py afterwards.
"""
import os,sys,json,hashlib,glob,fitz,subprocess,zipfile,shutil,io,time,concurrent.futures
from PIL import Image
from pathlib import Path
root=Path(sys.argv[1]);downloads=Path(sys.argv[2]);work=Path(sys.argv[3]); work.mkdir(parents=True,exist_ok=True)
ocrdir=work/'pages';ocrdir.mkdir(exist_ok=True); images=work/'visuals';images.mkdir(exist_ok=True)
exe=str(work/'bin'/'tesseract.exe'); base=json.loads((root/'frontend/data/chatbot-knowledge.json').read_text(encoding='utf8'))
sources=sorted({e['source'] for e in base if e['source'].lower().endswith('.pdf') and (downloads/e['source']).exists()})
jobs=[];meta={};
def add_page(source,loc,buf,original=False):
 ident=hashlib.sha256((source+'\0'+loc).encode('utf8')).hexdigest()[:24]
 im=Image.open(io.BytesIO(buf)).convert('RGB'); ocr=im.copy();ocr.thumbnail((2200,2200)); ocr.save(ocrdir/(ident+'.png'),optimize=True)
 im.thumbnail((1600,1600));im.save(images/(ident+'.jpg'),quality=78,optimize=True)
 meta[ident]={'file':ident+'.jpg','source':source,'location':loc,'contentType':'image/jpeg'};jobs.append((ident,source,loc))
for source in sources:
 doc=fitz.open(downloads/source)
 for i,page in enumerate(doc):
  if len(page.get_text().strip())>=80:continue
  if not page.get_images() and not page.get_drawings():continue
  pix=page.get_pixmap(matrix=fitz.Matrix(2,2),alpha=False);add_page(source,f'หน้า {i+1}',pix.tobytes('png'))
 print('PREP',source,flush=True)
for pdf,name in [('slides-0.pdf','Risk.pptx'),('slides-1.pdf','Day 2_1 RCA 5Tier 601.pptx')]:
 d=fitz.open(work/pdf)
 for i,page in enumerate(d):add_page(name,f'สไลด์ {i+1}',page.get_pixmap(matrix=fitz.Matrix(2,2),alpha=False).tobytes('png'))
for name in ['1794213933107.jpg','1794213871266.jpg','messageImage_1794213718092.jpg','messageImage_1794213636537.jpg','messageImage_1794213586457.jpg','messageImage_1794212943119.jpg','แนวทางตรวจ_Anti-HIV_หญิงตั้งครรภ์(1).png']:
 add_page(name,'ภาพ', (downloads/name).read_bytes(),True)
print('JOBS',len(jobs),flush=True)
env=os.environ.copy();env['OMP_THREAD_LIMIT']='1'
def run(job):
 ident,source,loc=job
 try:
  result=subprocess.run([exe,str(ocrdir/(ident+'.png')),'stdout','-l','tha+eng','--psm','11'],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,timeout=100,env=env)
  text=result.stdout.decode('utf8','replace').strip();return ident,source,loc,text
 except Exception:return ident,source,loc,''
records=[];done=0
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 for ident,source,loc,text in pool.map(run,jobs):
  done+=1
  if len(text)>=15:
   for k in range(0,len(text),1600):
    part=text[k:k+1600].strip()
    if len(part)>=15:records.append({'source':source,'location':loc+' (OCR อาจคลาดเคลื่อน โปรดตรวจภาพ)','text':part,'visualId':ident})
  if done%40==0:print('OCR',done,'/',len(jobs),flush=True)
out=root/'frontend/data';out.mkdir(exist_ok=True)
(out/'chatbot-ocr.json').write_text(json.dumps(records,ensure_ascii=False,separators=(',',':')),encoding='utf8')
(out/'chatbot-visuals.json').write_text(json.dumps(meta,ensure_ascii=False,separators=(',',':')),encoding='utf8')
with zipfile.ZipFile(out/'chatbot-visuals.zip','w',compression=zipfile.ZIP_STORED) as z:
 for ident in meta:z.write(images/(ident+'.jpg'),ident+'.jpg')
print('DONE',len(jobs),'records',len(records),'zipbytes',(out/'chatbot-visuals.zip').stat().st_size,flush=True)
