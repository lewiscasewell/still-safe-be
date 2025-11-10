import type { Context, Next } from "hono";
import { env } from "../config";
import { jwt } from "hono/jwt";

export const authMiddleware = async (c: Context, next: Next) => {
    const { ACCESS_SECRET } = env(c)
    return jwt({ secret: ACCESS_SECRET, headerName: "Authorization" })(c, next)
}