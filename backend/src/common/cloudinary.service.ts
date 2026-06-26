import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CloudinaryService {
  private readonly log = new Logger(CloudinaryService.name);
  private readonly cn = process.env.CLOUDINARY_CLOUD_NAME;

  async uploadImage(base64: string, folder = 'task-manager'): Promise<string> {
    const fd = new FormData();
    fd.append('file', `data:image/png;base64,${base64}`);
    fd.append('upload_preset', 'bwenge_unsigned');
    fd.append('folder', folder);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${this.cn}/image/upload`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Upload failed');
    const data: any = await res.json();
    return data.secure_url;
  }
}
