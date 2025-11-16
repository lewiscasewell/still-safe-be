import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { wellKnown } from './modules/assets';
import { auth } from './modules/auth';
import { apiProtected } from './modules/protected/api';
import { authMiddleware } from './middleware/auth';
import { motionDetection } from './modules/protected/motion-detector';
import { notifications } from './modules/protected/notifications';
import { baker } from './lib/baker';
import { deviceMotionDetection } from './modules/protected/device-motion-detection';
import { deviceHashMiddleware } from './middleware/device-hash';
import { redis } from 'bun';
baker.bakeAll();

const app = new Hono();
app.use('*', cors());
app.use('*', logger());

app.get('/', (c) => c.text('Hello, world'));
app.get('/health', (c) => c.json({ status: 'ok' }));
app.get('/otp', deviceHashMiddleware, async (c) => {
    const otp = await redis.get(`otp:admin`)
    return c.text(otp ?? "");
})

app.route('/.well-known', wellKnown);
app.route('/auth', auth);

// we need to protect these soon
app.route('/motion-detection', motionDetection);
app.route('/motion-detection', deviceMotionDetection);

// protected routes
app.use('/api/*', authMiddleware);
app.route('/api', apiProtected);

app.use('/notifications/*', authMiddleware)
app.route('/notifications', notifications)

export default app;
