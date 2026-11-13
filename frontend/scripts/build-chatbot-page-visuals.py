"""Create private previews for cited PDF pages not already in the image archives.
Usage: python build-chatbot-page-visuals.py DOWNLOADS_DIR WORK_DIR
"""
from pathlib import Path
import hashlib,io,json,os,re,sys,zipfile
from collections import defaultdict
import fitz
from PIL import Image
root=Path(__file__).resolve().parents[1];data=root/'data';downloads=Path(sys.argv[1]);work=Path(sys.argv[2]);work.mkdir(parents=True,exist_ok=True)
base=json.loads((data/'chatbot-knowledge.json').read_text(encoding='utf8'))+json.loads((data/'chatbot-extra.json').read_text(encoding='utf8'))
existing={**json.loads((data/'chatbot-visuals.json').read_text(encoding='utf8')),**json.loads((data/'chatbot-extra-visuals.json').read_text(encoding='utf8'))}
covered={(item['source'],item['location']) for item in existing.values()};sources=defaultdict(set)
for item in base:
 m=re.match(r'^หน้า (\d+)',item['location'])
 if m:
  source=item['source']; loc=f'หน้า {m[1]}'
  if (source,loc) not in covered and (source.lower().endswith('.pdf') or source=='สปสช. เอกสาร 2565 COSO ERM 2017'):sources[source].add(int(m[1]))
index={};arch=None;number=-1;used=0;created=[]
def new_archive():
 global arch,number,used
 if arch:arch.close()
 number+=1;used=0;file=work/f'chatbot-page-visuals-{number}.zip';created.append(file);arch=zipfile.ZipFile(file,'w',compression=zipfile.ZIP_STORED)
new_archive();done=0
for source,pages in sorted(sources.items()):
 filepath=Path('D:/Temp/risk-nhso-2565.pdf') if source=='สปสช. เอกสาร 2565 COSO ERM 2017' else downloads/source
 if not filepath.is_file():raise FileNotFoundError(source)
 with fitz.open(filepath) as doc:
  for page_no in sorted(pages):
   if page_no<1 or page_no>len(doc):raise ValueError(f'Invalid source page: {source} {page_no}')
   loc=f'หน้า {page_no}';ident=hashlib.sha256((source+'\0'+loc).encode('utf8')).hexdigest()[:24]
   pix=doc[page_no-1].get_pixmap(matrix=fitz.Matrix(1.3,1.3),alpha=False)
   im=Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB');im.thumbnail((1200,1200));buffer=io.BytesIO();im.save(buffer,format='JPEG',quality=60,optimize=True);content=buffer.getvalue()
   if used+len(content)>60*1024*1024:new_archive()
   arch.writestr(ident+'.jpg',content);used+=len(content)
   index[ident]={'file':ident+'.jpg','source':source,'location':loc,'archive':number}
   done+=1
   if done%100==0:print('Rendered',done,'pages',flush=True)
arch.close()
for file in created:os.replace(file,data/file.name)
(data/'chatbot-page-visuals.json').write_text(json.dumps(index,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print('DONE',done,'pages',len(created),'archives',sum((data/f.name).stat().st_size for f in created),'bytes',flush=True)
