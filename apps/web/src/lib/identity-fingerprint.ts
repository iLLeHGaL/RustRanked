import { createHash } from "crypto";
import { stripe } from "@/lib/stripe";
import { prisma, IdentityMatchType } from "@rustranked/database";

const FINGERPRINT_SALT = process.env.IDENTITY_FINGERPRINT_SALT || "default-identity-salt";

interface IdentityData {
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  idNumber?: string;
}

interface Fingerprints {
  fingerprintHash: string;
  documentIdHash: string | null;
}

interface DuplicateCheckResult {
  hasDuplicate: boolean;
  matchedUserId: string | null;
  matchedUserBanned: boolean;
  matchType: IdentityMatchType | null;
}

export async function extractIdentityData(
  verificationSessionId: string
): Promise<IdentityData | null> {
  try {
    const session = await stripe.identity.verificationSessions.retrieve(
      verificationSessionId,
      { expand: ["verified_outputs"] }
    );

    const outputs = (session as any).verified_outputs;
    if (!outputs) {
      console.warn("No verified_outputs on verification session", verificationSessionId);
      return null;
    }

    const firstName = outputs.first_name;
    const lastName = outputs.last_name;
    const dob = outputs.dob;
    const idNumber = outputs.id_number;

    if (!firstName || !lastName || !dob) {
      console.warn("Missing identity fields in verified_outputs", verificationSessionId);
      return null;
    }

    const dobString =
      typeof dob === "string"
        ? dob
        : `${dob.year}-${String(dob.month).padStart(2, "0")}-${String(dob.day).padStart(2, "0")}`;

    return {
      firstName,
      lastName,
      dob: dobString,
      idNumber: idNumber || undefined,
    };
  } catch (error) {
    console.error("Failed to extract identity data:", error);
    return null;
  }
}

export function generateFingerprints(data: IdentityData): Fingerprints {
  const normalized = `${data.firstName.toLowerCase()}|${data.lastName.toLowerCase()}|${data.dob}`;
  const fingerprintHash = createHash("sha256")
    .update(normalized + FINGERPRINT_SALT)
    .digest("hex");

  let documentIdHash: string | null = null;
  if (data.idNumber) {
    documentIdHash = createHash("sha256")
      .update(data.idNumber + FINGERPRINT_SALT)
      .digest("hex");
  }

  return { fingerprintHash, documentIdHash };
}

export async function checkForDuplicates(
  userId: string,
  fingerprints: Fingerprints
): Promise<DuplicateCheckResult> {
  const conditions: any[] = [
    { fingerprintHash: fingerprints.fingerprintHash },
  ];

  if (fingerprints.documentIdHash) {
    conditions.push({ documentIdHash: fingerprints.documentIdHash });
  }

  const existingFingerprints = await prisma.identityFingerprint.findMany({
    where: {
      AND: [
        { userId: { not: userId } },
        { OR: conditions },
      ],
    },
    include: {
      user: {
        include: {
          bans: {
            where: { isActive: true },
          },
        },
      },
    },
  });

  if (existingFingerprints.length === 0) {
    return {
      hasDuplicate: false,
      matchedUserId: null,
      matchedUserBanned: false,
      matchType: null,
    };
  }

  // Prioritize matches on banned accounts
  const bannedMatch = existingFingerprints.find(
    (fp) => fp.user.bans.length > 0
  );
  const match = bannedMatch || existingFingerprints[0];

  const nameMatch = match.fingerprintHash === fingerprints.fingerprintHash;
  const docMatch =
    fingerprints.documentIdHash !== null &&
    match.documentIdHash === fingerprints.documentIdHash;

  let matchType: IdentityMatchType;
  if (nameMatch && docMatch) {
    matchType = IdentityMatchType.BOTH;
  } else if (docMatch) {
    matchType = IdentityMatchType.DOCUMENT_ID;
  } else {
    matchType = IdentityMatchType.NAME_DOB;
  }

  return {
    hasDuplicate: true,
    matchedUserId: match.userId,
    matchedUserBanned: match.user.bans.length > 0,
    matchType,
  };
}
