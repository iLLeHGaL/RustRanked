import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      discordId: string;
      steamId: string | null;
      verificationStatus: string;
      subscriptionStatus: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId?: string;
    discordId?: string;
    steamId?: string | null;
    verificationStatus?: string;
    subscriptionStatus?: string | null;
  }
}
