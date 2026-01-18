import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@rustranked/database";

const API_KEY_SALT = process.env.SERVER_API_SECRET || "default-salt";

export function hashApiKey(apiKey: string): string {
  return createHash("sha256")
    .update(apiKey + API_KEY_SALT)
    .digest("hex");
}

export function generateApiKey(): { key: string; hash: string } {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const key = `rr_${Buffer.from(randomBytes).toString("hex")}`;
  const hash = hashApiKey(key);
  return { key, hash };
}

export async function verifyServerRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authorized: false, server: null, error: "Missing authorization header" };
  }

  const apiKey = authHeader.substring(7);
  const keyHash = hashApiKey(apiKey);

  const server = await prisma.gameServer.findFirst({
    where: {
      apiKeyHash: keyHash,
      isActive: true,
    },
  });

  if (!server) {
    return { authorized: false, server: null, error: "Invalid API key" };
  }

  // Update last seen
  await prisma.gameServer.update({
    where: { id: server.id },
    data: { lastSeen: new Date() },
  });

  return { authorized: true, server, error: null };
}

export type ServerAuthResult = Awaited<ReturnType<typeof verifyServerRequest>>;
