import { Hono, type Context, type Next } from "hono";
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { saveCredential, getCredential, updateCounter } from "../storage";
import { createTokens, verifyRefresh } from "../lib/jwt";
import { redis } from "bun";

export const auth = new Hono();

const rpID = "still-safe.lewiscasewell.com";
const rpName = "Still Safe";
const expectedOrigin = "https://still-safe.lewiscasewell.com";
const userId = "admin";

const challengeKey = (id: string) => `challenge:${id}`;
const sessionKey = (id: string) => `session:${id}`;

const withOtp = async (c: Context, next: Next) => {
    const body = await c.req.json();
    const { username, code } = body;
    if (!username || !code) return c.json({ error: "Invalid request" }, 400);

    const storedOtp = await redis.get(`otp:${username}`);
    if (!storedOtp || storedOtp !== code) {
        return c.json({ error: "Invalid credentials" }, 400);
    }

    await next();
}

auth.post("/otp/generate", async (c) => {
    const body = await c.req.json();
    const { username } = body;
    if (!username) return c.json({ error: "Invalid request" }, 400);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await redis.set(`otp:${username}`, otp);
    await redis.expire(`otp:${username}`, 60 * 5); // 5 minutes

    console.log(`OTP generated for ${username}: ${otp}`);

    return c.json({ success: true });
});

auth.post("/otp/verify", withOtp, async (c) => {
    const { username } = await c.req.json();

    await redis.set(`otp:${username}:verified`, "true");
    await redis.expire(`otp:${username}:verified`, 60 * 5); // 5 minutes

    return c.json({ success: true });
});

// Registration Options
auth.post("/webauthn/register/options", withOtp, async (c) => {
    const verified = await redis.get(`otp:admin:verified`);
    if (!verified) return c.json({ error: "Invalid credentials" }, 400);

    const options = await generateRegistrationOptions({
        rpID,
        rpName,
        userID: Buffer.from(userId),
        userName: "Lewis's iPhone",
        authenticatorSelection: {
            residentKey: "required",
            userVerification: "required",
        },
        attestationType: "none",
    });

    try {
        await redis.set(challengeKey(userId), String(options.challenge));
        await redis.expire(challengeKey(userId), 300);
    } catch (err: any) {
        console.error("Redis error storing challenge:", err);
        return c.json({ error: "Failed to store challenge" }, 500);
    }

    return c.json(options);
});

// Registration Verification
auth.post("/webauthn/register/verify", withOtp, async (c) => {
    const body = await c.req.json();
    const { credential: credentialResponse } = body;

    try {
        const expectedChallenge = await redis.get(challengeKey(userId));
        if (!expectedChallenge) return c.json({ error: "No challenge" }, 400);

        const verification = await verifyRegistrationResponse({
            response: credentialResponse,
            expectedChallenge,
            expectedOrigin,
            expectedRPID: rpID,
        });

        if (!verification.verified || !verification.registrationInfo) {
            return c.json({ verified: false }, 400);
        }

        const { credential } = verification.registrationInfo;
        const { id, publicKey, counter } = credential;

        saveCredential({
            userId,
            credentialID: id,
            credentialPublicKey: isoBase64URL.fromBuffer(publicKey),
            counter,
        });

        return c.json({ verified: true });
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

// Login Options
auth.post("/webauthn/login/options", async (c) => {
    try {
        const credential = getCredential(userId);

        const options = await generateAuthenticationOptions({
            rpID,
            userVerification: "required",
            allowCredentials: [
                {
                    id: credential.credentialID,
                    transports: ["internal"],
                },
            ],
        });

        try {
            await redis.set(challengeKey(userId), String(options.challenge));
            await redis.expire(challengeKey(userId), 300);
        } catch (err: any) {
            console.error("Redis error storing challenge:", err);
            return c.json({ error: "Failed to store challenge" }, 500);
        }

        return c.json(options);
    } catch (err: any) {
        return c.json({ error: err.message }, 404);
    }
});

// Login Verification
auth.post("/webauthn/login/verify", async (c) => {
    try {
        const body = await c.req.json();
        const { assertion } = body;
        const expectedChallenge = await redis.get(challengeKey(userId));
        if (!expectedChallenge) return c.json({ error: "No challenge" }, 400);

        const credential = getCredential(userId);

        const verification = await verifyAuthenticationResponse({
            response: assertion,
            expectedChallenge,
            expectedOrigin,
            expectedRPID: rpID,
            credential: {
                publicKey: isoBase64URL.toBuffer(credential.credentialPublicKey),
                id: credential.credentialID,
                counter: credential.counter,
            },
        });

        if (!verification.verified || !verification.authenticationInfo) {
            return c.json({ verified: false }, 401);
        }

        updateCounter(userId, verification.authenticationInfo.newCounter);

        const tokens = await createTokens(c, userId);
        await redis.set(sessionKey(userId), tokens.refreshToken);
        await redis.expire(sessionKey(userId), 60 * 60 * 24 * 7); // 7 days

        return c.json({ verified: true, ...tokens });
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

// Logout
auth.post("/webauthn/logout", async (c) => {
    const { refreshToken } = await c.req.json();
    if (!refreshToken) return c.json({ error: "Missing token" }, 400);

    try {
        const payload = await verifyRefresh(c, refreshToken);
        const id = payload.sub as string;

        const stored = await redis.get(sessionKey(id));
        if (stored !== refreshToken) {
            return c.json({ error: "Invalid session" }, 401);
        }

        await redis.del(sessionKey(id));
        return c.json({ success: true });
    } catch {
        return c.json({ error: "Invalid refresh token" }, 401);
    }
});

// Refresh Token
auth.post("/refresh", async (c) => {
    const { refreshToken } = await c.req.json();
    if (!refreshToken) return c.json({ error: "Missing token" }, 400);

    try {
        const payload = await verifyRefresh(c, refreshToken);
        const id = payload.sub as string;

        const stored = await redis.get(sessionKey(id));
        if (stored !== refreshToken) {
            return c.json({ error: "Invalid session" }, 401);
        }

        const tokens = await createTokens(c, id);
        await redis.set(sessionKey(id), tokens.refreshToken);
        await redis.expire(sessionKey(id), 60 * 60 * 24 * 7);

        return c.json(tokens);
    } catch {
        return c.json({ error: "Invalid refresh token" }, 401);
    }
});
