import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CloudinaryService {
  private readonly log = new Logger(CloudinaryService.name);
  private readonly cn = process.env.CLOUDINARY_CLOUD_NAME;
  private readonly ak = process.env.CLOUDINARY_API_KEY;
  private readonly as = process.env.CLOUDINARY_API_SECRET;

  async uploadImage(base64: string, folder = 'task-manager'): Promise<string> {
    const fd = new FormData();
    fd.append('file', `data:image/png;base64,${base64}`);
    fd.append('upload_preset', 'bwenge_unsigned');
    fd.append('folder', folder);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${this.cn}/image/upload`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Upload failed');
    return (await res.json()).secure_url;
  }
}
