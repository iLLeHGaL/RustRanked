import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, VerificationStatus } from "@rustranked/database";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ isVerified: false });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { verificationStatus: true },
  });

  return NextResponse.json({
    isVerified: user?.verificationStatus === VerificationStatus.VERIFIED,
  });
}
