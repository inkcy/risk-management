"""Reduce generated page previews; preserve supplied standalone images byte-for-byte."""
import io, json, os, sys, zipfile
from pathlib import Path
from PIL import Image

data = Path(__file__).resolve().parent.parent / 'data'
downloads = Path(sys.argv[1])
index_path = data / 'chatbot-visuals.json'
archive_path = data / 'chatbot-visuals.zip'
temporary = data / 'chatbot-visuals.compact.zip'
index = json.loads(index_path.read_text(encoding='utf8'))
with zipfile.ZipFile(archive_path) as source, zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_STORED) as target:
    for ident, item in index.items():
        original = downloads / item['source']
        if item['location'] == 'ภาพ' and original.is_file() and original.suffix.lower() in ('.jpg', '.jpeg', '.png'):
            ext = 'png' if original.suffix.lower() == '.png' else 'jpg'
            item['file'] = ident + '.' + ext
            item['contentType'] = 'image/png' if ext == 'png' else 'image/jpeg'
            target.writestr(item['file'], original.read_bytes())
        else:
            image = Image.open(io.BytesIO(source.read(item['file']))).convert('RGB')
            image.thumbnail((1200, 1200))
            output = io.BytesIO(); image.save(output, format='JPEG', quality=65, optimize=True)
            target.writestr(item['file'], output.getvalue())
os.replace(temporary, archive_path)
index_path.write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
print('Preview archive bytes:', archive_path.stat().st_size, 'images:', len(index))
