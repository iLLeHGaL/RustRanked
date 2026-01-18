import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSteamLoginUrl } from "@/lib/steam";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const returnUrl = new URL("/api/steam/callback", request.url).toString();
  const steamLoginUrl = getSteamLoginUrl(returnUrl);

  return NextResponse.redirect(steamLoginUrl);
}
