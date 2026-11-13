import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import routeMeta from './route-meta.json';
import shareImage from './share-image.json';

/*
  Every link-preview image (route-meta's `ogImage`s and the default) is a 1200x630 JPEG under 300 KB, as the
  `og:image:width/height/type` tags SeoHead and the prerender declare for all of them. WhatsApp shows a large picture
  only near 1.91:1 and is unreliable with WebP (owner, 2026-11-14: links pasted in WhatsApp should show a picture).
*/
const DOMAIN = 'https://www.chessplaybook.com/';

function jpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    // SOF0..SOF15 except DHT (C4), JPG (C8) and DAC (CC)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

const urls = new Set<string>([shareImage.url]);
for (const entry of Object.values(routeMeta) as { ogImage?: string }[]) {
  if (entry.ogImage) urls.add(entry.ogImage);
}

// The public source copy leaves the preview images out as media (build-snapshot.sh), so there the test has nothing to read.
describe.skipIf(!existsSync(resolve(process.cwd(), 'public/assets/share')))('link-preview images', () => {
  it('the declared size and type are the WhatsApp-safe ones', () => {
    expect(shareImage).toMatchObject({ width: 1200, height: 630, type: 'image/jpeg' });
  });

  for (const url of urls) {
    it(`${url.replace(DOMAIN, '/')} is a 1200x630 JPEG under 300 KB`, () => {
      expect(url.startsWith(DOMAIN)).toBe(true);
      const file = resolve(process.cwd(), 'public', url.slice(DOMAIN.length));
      expect(statSync(file).size).toBeLessThan(300_000);
      expect(jpegSize(readFileSync(file))).toEqual({ width: shareImage.width, height: shareImage.height });
    });
  }
});
