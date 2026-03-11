import { Hono } from 'hono';
import { logger } from 'hono/logger';

import { baker } from './lib/baker';
import { deviceMotionDetection } from './modules/protected/device-motion-detection';
import { startTelegramPolling } from './modules/telegram';

baker.bakeAll();
startTelegramPolling();

const app = new Hono();
app.use('*', logger());

app.get('/', (c) => c.text('Hello, world'));
app.get('/health', (c) => c.json({ status: 'ok' }));

app.route('/motion-detection', deviceMotionDetection);

export default app;
