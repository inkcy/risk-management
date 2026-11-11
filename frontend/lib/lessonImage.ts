const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

function readDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('อ่านรูปไม่สำเร็จ'));
    reader.readAsDataURL(blob);
  });
}

export async function prepareLessonImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size || file.size > MAX_SOURCE_BYTES) {
    throw new Error('กรุณาเลือกรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 20 MB');
  }
  if (file.size <= MAX_UPLOAD_BYTES) return readDataUrl(file);

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('อ่านรูปไม่สำเร็จ กรุณาตรวจสอบไฟล์'));
      image.src = objectUrl;
    });
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('ขนาดภาพใหญ่เกินไป กรุณาลดขนาดภาพก่อนนำเข้า');
    let scale = Math.min(1, 3000 / Math.max(image.naturalWidth, image.naturalHeight));
    for (let attempt = 0; attempt < 5; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('เบราว์เซอร์ไม่รองรับการปรับขนาดรูป');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', Math.max(0.72, 0.92 - attempt * 0.04)));
      if (blob && ['image/png', 'image/jpeg', 'image/webp'].includes(blob.type) && blob.size <= MAX_UPLOAD_BYTES) return readDataUrl(blob);
      scale *= 0.85;
    }
    throw new Error('ไม่สามารถลดขนาดรูปได้เพียงพอ กรุณาลดขนาดไฟล์แล้วลองอีกครั้ง');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
