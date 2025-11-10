import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { wellKnown } from './modules/assets';
import { auth } from './modules/auth';
import { apiProtected } from './modules/protected/api';
import { authMiddleware } from './middleware/auth';
import { motionDetection } from './modules/protected/motion-detector';
import { notifications } from './modules/protected/notifications';
import { sendNotification } from './service/push-notification';
import { baker } from './lib/baker';
import { deviceMotionDetection } from './modules/protected/device-motion-detection';
baker.bakeAll();

const app = new Hono();
app.use('*', cors());
app.use('*', logger());

app.get('/', (c) => c.text('Hello, world'));
app.get('/test-notification', async (c) => {
    try {
        console.log("Sending notification to admin");
        await sendNotification({ userId: "admin", title: "Test Notification", body: "This is a test notification" });
        return c.json({ success: true });
    } catch (err: any) {
        console.error("Test notification error:", err);
        return c.json({ error: err.message }, 500);
    }
});

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
