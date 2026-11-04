import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist/admin', { recursive: true });
await cp('storefront/dist', 'dist', { recursive: true });
await cp('web/dist', 'dist/admin', { recursive: true });
