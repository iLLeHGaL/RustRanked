import { Navbar } from "@/components/navbar";
import {
  ShieldAlert,
  Ban,
  MessageCircleOff,
  Megaphone,
  UserX,
  Globe,
  Fingerprint,
  Gavel,
} from "lucide-react";

const RULES = [
  {
    icon: ShieldAlert,
    title: "No Cheating, Hacking, or Scripting",
    description:
      "Any use of cheats, hacks, scripts, macros, or exploits is strictly prohibited. This includes recoil scripts, ESP, aimbots, and any third-party software that provides an unfair advantage.",
  },
  {
    icon: Ban,
    title: "No Racism, Hate Speech, or Discrimination",
    description:
      "Racist, sexist, homophobic, or otherwise discriminatory language is not tolerated in any form, including in-game chat, voice, signs, or team names.",
  },
  {
    icon: MessageCircleOff,
    title: "No Harassment, Doxxing, or Threats",
    description:
      "Do not harass, stalk, threaten, or share personal information about other players. This includes real-life threats, repeated targeting, and toxic behavior.",
  },
  {
    icon: Megaphone,
    title: "No Advertising or Spam",
    description:
      "Do not advertise other servers, services, or products. Spamming chat, voice, or signs is not allowed.",
  },
  {
    icon: UserX,
    title: "No Impersonating Staff",
    description:
      "Do not impersonate RustRanked administrators, moderators, or staff members. Do not falsely claim to be associated with the platform.",
  },
  {
    icon: Globe,
    title: "English in Global Chat",
    description:
      "Please use English in global chat so that moderators can effectively monitor communications. You are free to use any language in team chat or voice.",
  },
  {
    icon: Fingerprint,
    title: "Identity Verification",
    description:
      "Each person is allowed one account. Sharing accounts, using alt accounts, or circumventing identity verification will result in a permanent ban.",
  },
  {
    icon: Gavel,
    title: "Admin Decisions are Final",
    description:
      "RustRanked staff reserve the right to take any action deemed necessary to maintain a fair and enjoyable environment. Admin decisions on bans and disputes are final.",
  },
];

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Server Rules</h1>
          <p className="text-zinc-400">
            All players must follow these rules. Violations may result in
            warnings, temporary bans, or permanent bans.
          </p>
        </div>

        <div className="space-y-4">
          {RULES.map((rule, index) => (
            <div key={index} className="card flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rust-600/10 flex-shrink-0 mt-0.5">
                <rule.icon className="h-5 w-5 text-rust-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">
                  {index + 1}. {rule.title}
                </h3>
                <p className="text-sm text-zinc-400">{rule.description}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
