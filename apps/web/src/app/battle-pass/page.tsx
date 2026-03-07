import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { BattlePassContent } from "./battle-pass-content";

export const dynamic = "force-dynamic";

export default async function BattlePassPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  return <BattlePassContent />;
}
