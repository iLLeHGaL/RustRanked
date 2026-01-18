// Steam OpenID authentication helpers

const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";

export function getSteamLoginUrl(returnUrl: string): string {
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnUrl,
    "openid.realm": new URL(returnUrl).origin,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });

  return `${STEAM_OPENID_URL}?${params.toString()}`;
}

export async function verifySteamLogin(
  params: URLSearchParams
): Promise<string | null> {
  // Change mode to check_authentication for verification
  const verifyParams = new URLSearchParams(params);
  verifyParams.set("openid.mode", "check_authentication");

  try {
    const response = await fetch(STEAM_OPENID_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: verifyParams.toString(),
    });

    const text = await response.text();

    if (text.includes("is_valid:true")) {
      // Extract Steam ID from claimed_id
      const claimedId = params.get("openid.claimed_id");
      if (claimedId) {
        const match = claimedId.match(/\/id\/(\d+)$/);
        if (match) {
          return match[1];
        }
      }
    }
  } catch (error) {
    console.error("Steam verification error:", error);
  }

  return null;
}

export async function getSteamProfile(steamId: string, apiKey: string) {
  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.response?.players?.[0]) {
      const player = data.response.players[0];
      return {
        steamId: player.steamid,
        name: player.personaname,
        avatar: player.avatarfull,
        profileUrl: player.profileurl,
      };
    }
  } catch (error) {
    console.error("Steam profile fetch error:", error);
  }

  return null;
}
