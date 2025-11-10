import type { Context } from "hono";
import { env } from "../config";
import { sign, verify } from "hono/jwt";

export async function createTokens(c: Context, userId: string) {
    const { ACCESS_SECRET, REFRESH_SECRET } = env(c);

    const accessToken = await sign({
        sub: userId, exp: Math.floor(Date.now() / 1000) + 60 * 5 // 5 minutes 
    }, ACCESS_SECRET)

    const refreshToken = await sign({
        sub: userId, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days 
    }, REFRESH_SECRET)

    return { accessToken, refreshToken }
}

export async function verifyAccess(c: Context, token: string) {
    const { ACCESS_SECRET } = env(c);
    return await verify(token, ACCESS_SECRET);
}

export async function verifyRefresh(c: Context, token: string) {
    const { REFRESH_SECRET } = env(c);
    return await verify(token, REFRESH_SECRET);
}