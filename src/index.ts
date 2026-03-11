import { Hono } from 'hono';
import { logger } from 'hono/logger';

import { baker } from './lib/baker';
import { deviceMotionDetection } from './modules/protected/device-motion-detection';
import { telegram } from './modules/telegram';

baker.bakeAll();

const app = new Hono();
app.use('*', logger());

app.get('/', (c) => c.text('Hello, world'));
app.get('/health', (c) => c.json({ status: 'ok' }));

app.route('/motion-detection', deviceMotionDetection);
app.route('/telegram', telegram);

export default app;
