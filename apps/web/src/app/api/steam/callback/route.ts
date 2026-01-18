import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifySteamLogin, getSteamProfile } from "@/lib/steam";
import { prisma } from "@rustranked/database";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);

  // Verify Steam login
  const steamId = await verifySteamLogin(searchParams);

  if (!steamId) {
    return NextResponse.redirect(
      new URL("/dashboard?error=steam_verification_failed", request.url)
    );
  }

  // Check if Steam account is already linked to another user
  const existingUser = await prisma.user.findUnique({
    where: { steamId },
  });

  if (existingUser && existingUser.id !== session.user.id) {
    return NextResponse.redirect(
      new URL("/dashboard?error=steam_already_linked", request.url)
    );
  }

  // Get Steam profile
  const steamApiKey = process.env.STEAM_API_KEY;
  let steamName: string | null = null;
  let steamAvatar: string | null = null;

  if (steamApiKey) {
    const profile = await getSteamProfile(steamId, steamApiKey);
    if (profile) {
      steamName = profile.name;
      steamAvatar = profile.avatar;
    }
  }

  // Update user with Steam info
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      steamId,
      steamName,
      steamAvatar,
    },
  });

  return NextResponse.redirect(
    new URL("/dashboard?success=steam_linked", request.url)
  );
}
