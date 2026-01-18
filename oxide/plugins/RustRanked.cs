using Newtonsoft.Json;
using Oxide.Core;
using Oxide.Core.Libraries;
using Oxide.Core.Libraries.Covalence;
using System;
using System.Collections.Generic;
using System.Text;

namespace Oxide.Plugins
{
    [Info("RustRanked", "RustRanked", "1.0.0")]
    [Description("Integration plugin for RustRanked competitive platform")]
    public class RustRanked : CovalencePlugin
    {
        #region Configuration

        private Configuration config;

        private class Configuration
        {
            [JsonProperty("API URL")]
            public string ApiUrl { get; set; } = "https://rustranked.com/api";

            [JsonProperty("API Key")]
            public string ApiKey { get; set; } = "YOUR_API_KEY_HERE";

            [JsonProperty("Kick Unverified Players")]
            public bool KickUnverified { get; set; } = true;

            [JsonProperty("Show Welcome Message")]
            public bool ShowWelcome { get; set; } = true;

            [JsonProperty("Check Interval (seconds)")]
            public float CheckInterval { get; set; } = 30f;
        }

        protected override void LoadDefaultConfig()
        {
            config = new Configuration();
            SaveConfig();
        }

        protected override void LoadConfig()
        {
            base.LoadConfig();
            try
            {
                config = Config.ReadObject<Configuration>();
                if (config == null) throw new Exception();
            }
            catch
            {
                PrintError("Configuration file is corrupt! Loading default configuration...");
                LoadDefaultConfig();
            }
        }

        protected override void SaveConfig() => Config.WriteObject(config);

        #endregion

        #region Data Storage

        private Dictionary<string, PlayerData> verifiedPlayers = new Dictionary<string, PlayerData>();

        private class PlayerData
        {
            public string UserId { get; set; }
            public string DiscordName { get; set; }
            public string SteamName { get; set; }
            public int Elo { get; set; }
            public string Rank { get; set; }
            public string RankName { get; set; }
            public string RankColor { get; set; }
            public int Kills { get; set; }
            public int Deaths { get; set; }
            public int Wins { get; set; }
            public int Losses { get; set; }
            public DateTime VerifiedAt { get; set; }
        }

        #endregion

        #region Hooks

        private void Init()
        {
            Puts("RustRanked plugin loaded!");
        }

        private void OnServerInitialized()
        {
            // Verify all currently connected players
            foreach (var player in players.Connected)
            {
                VerifyPlayer(player);
            }
        }

        private void OnUserConnected(IPlayer player)
        {
            VerifyPlayer(player);
        }

        private void OnUserDisconnected(IPlayer player)
        {
            verifiedPlayers.Remove(player.Id);
        }

        private void OnPlayerDeath(BasePlayer victim, HitInfo info)
        {
            if (victim == null) return;

            var attacker = info?.InitiatorPlayer;
            if (attacker == null || attacker == victim) return;

            // Report kill/death to API
            ReportKill(attacker.UserIDString, victim.UserIDString);
        }

        #endregion

        #region API Calls

        private void VerifyPlayer(IPlayer player)
        {
            if (player == null || !player.IsConnected) return;

            var steamId = player.Id;
            var headers = new Dictionary<string, string>
            {
                { "Authorization", $"Bearer {config.ApiKey}" },
                { "Content-Type", "application/json" }
            };

            var body = JsonConvert.SerializeObject(new { steamId });

            webrequest.Enqueue(
                $"{config.ApiUrl}/server/verify-player",
                body,
                (code, response) => HandleVerifyResponse(player, code, response),
                this,
                RequestMethod.POST,
                headers
            );
        }

        private void HandleVerifyResponse(IPlayer player, int code, string response)
        {
            if (!player.IsConnected) return;

            if (code != 200)
            {
                PrintWarning($"Failed to verify player {player.Name} ({player.Id}): HTTP {code}");
                if (config.KickUnverified)
                {
                    player.Kick("RustRanked: Unable to verify your account. Please try again later.");
                }
                return;
            }

            try
            {
                var result = JsonConvert.DeserializeObject<VerifyResponse>(response);

                if (!result.Allowed)
                {
                    PrintWarning($"Player {player.Name} ({player.Id}) not allowed: {result.Reason}");

                    if (config.KickUnverified)
                    {
                        player.Kick($"RustRanked: {result.Message}");
                    }
                    return;
                }

                // Store verified player data
                verifiedPlayers[player.Id] = new PlayerData
                {
                    UserId = result.Player.Id,
                    DiscordName = result.Player.DiscordName,
                    SteamName = result.Player.SteamName,
                    Elo = result.Player.Elo,
                    Rank = result.Player.Rank,
                    RankName = result.Player.RankName,
                    RankColor = result.Player.RankColor,
                    Kills = result.Player.Kills,
                    Deaths = result.Player.Deaths,
                    Wins = result.Player.Wins,
                    Losses = result.Player.Losses,
                    VerifiedAt = DateTime.UtcNow
                };

                Puts($"Player {player.Name} verified: {result.Player.RankName} ({result.Player.Elo} ELO)");

                if (config.ShowWelcome)
                {
                    player.Message($"<color=#cd4832>[RustRanked]</color> Welcome, <color={result.Player.RankColor}>{result.Player.RankName}</color> {player.Name}!");
                    player.Message($"<color=#cd4832>[RustRanked]</color> Your ELO: <color=#ffffff>{result.Player.Elo}</color> | K/D: {result.Player.Kills}/{result.Player.Deaths}");
                }
            }
            catch (Exception ex)
            {
                PrintError($"Error parsing verify response: {ex.Message}");
            }
        }

        private void ReportKill(string killerSteamId, string victimSteamId)
        {
            var headers = new Dictionary<string, string>
            {
                { "Authorization", $"Bearer {config.ApiKey}" },
                { "Content-Type", "application/json" }
            };

            // Report kill for attacker
            var killerBody = JsonConvert.SerializeObject(new { steamId = killerSteamId, kills = 1, deaths = 0 });
            webrequest.Enqueue($"{config.ApiUrl}/server/report-stats", killerBody, (code, response) => { }, this, RequestMethod.POST, headers);

            // Report death for victim
            var victimBody = JsonConvert.SerializeObject(new { steamId = victimSteamId, kills = 0, deaths = 1 });
            webrequest.Enqueue($"{config.ApiUrl}/server/report-stats", victimBody, (code, response) => { }, this, RequestMethod.POST, headers);
        }

        #endregion

        #region Commands

        [Command("rr", "rustranked")]
        private void CmdRustRanked(IPlayer player, string command, string[] args)
        {
            if (args.Length == 0)
            {
                ShowHelp(player);
                return;
            }

            switch (args[0].ToLower())
            {
                case "stats":
                    ShowStats(player);
                    break;
                case "top":
                case "leaderboard":
                    ShowLeaderboard(player);
                    break;
                case "verify":
                    VerifyPlayer(player);
                    player.Message("<color=#cd4832>[RustRanked]</color> Verifying your account...");
                    break;
                default:
                    ShowHelp(player);
                    break;
            }
        }

        private void ShowHelp(IPlayer player)
        {
            var sb = new StringBuilder();
            sb.AppendLine("<color=#cd4832>=== RustRanked Commands ===</color>");
            sb.AppendLine("<color=#888>/rr stats</color> - View your stats");
            sb.AppendLine("<color=#888>/rr top</color> - View leaderboard");
            sb.AppendLine("<color=#888>/rr verify</color> - Re-verify your account");
            player.Message(sb.ToString());
        }

        private void ShowStats(IPlayer player)
        {
            if (!verifiedPlayers.TryGetValue(player.Id, out var data))
            {
                player.Message("<color=#cd4832>[RustRanked]</color> You are not verified. Use /rr verify");
                return;
            }

            var kd = data.Deaths > 0 ? ((float)data.Kills / data.Deaths).ToString("F2") : data.Kills.ToString();
            var winRate = (data.Wins + data.Losses) > 0
                ? ((float)data.Wins / (data.Wins + data.Losses) * 100).ToString("F1") + "%"
                : "N/A";

            var sb = new StringBuilder();
            sb.AppendLine("<color=#cd4832>=== Your RustRanked Stats ===</color>");
            sb.AppendLine($"Rank: <color={data.RankColor}>{data.RankName}</color>");
            sb.AppendLine($"ELO: <color=#ffffff>{data.Elo}</color>");
            sb.AppendLine($"K/D: <color=#ffffff>{data.Kills}/{data.Deaths}</color> ({kd})");
            sb.AppendLine($"W/L: <color=#ffffff>{data.Wins}/{data.Losses}</color> ({winRate})");
            player.Message(sb.ToString());
        }

        private void ShowLeaderboard(IPlayer player)
        {
            // Get top players from connected verified players
            var sortedPlayers = new List<KeyValuePair<string, PlayerData>>(verifiedPlayers);
            sortedPlayers.Sort((a, b) => b.Value.Elo.CompareTo(a.Value.Elo));

            var sb = new StringBuilder();
            sb.AppendLine("<color=#cd4832>=== RustRanked Leaderboard (Online) ===</color>");

            var count = 0;
            foreach (var kvp in sortedPlayers)
            {
                if (count >= 10) break;
                count++;

                var data = kvp.Value;
                sb.AppendLine($"{count}. <color={data.RankColor}>{data.SteamName}</color> - {data.Elo} ELO");
            }

            if (count == 0)
            {
                sb.AppendLine("No ranked players online.");
            }

            sb.AppendLine("");
            sb.AppendLine("<color=#888>Visit rustranked.com for full leaderboard</color>");
            player.Message(sb.ToString());
        }

        #endregion

        #region API Response Classes

        private class VerifyResponse
        {
            [JsonProperty("allowed")]
            public bool Allowed { get; set; }

            [JsonProperty("reason")]
            public string Reason { get; set; }

            [JsonProperty("message")]
            public string Message { get; set; }

            [JsonProperty("player")]
            public VerifyPlayerData Player { get; set; }
        }

        private class VerifyPlayerData
        {
            [JsonProperty("id")]
            public string Id { get; set; }

            [JsonProperty("discordName")]
            public string DiscordName { get; set; }

            [JsonProperty("steamName")]
            public string SteamName { get; set; }

            [JsonProperty("elo")]
            public int Elo { get; set; }

            [JsonProperty("rank")]
            public string Rank { get; set; }

            [JsonProperty("rankName")]
            public string RankName { get; set; }

            [JsonProperty("rankColor")]
            public string RankColor { get; set; }

            [JsonProperty("kills")]
            public int Kills { get; set; }

            [JsonProperty("deaths")]
            public int Deaths { get; set; }

            [JsonProperty("wins")]
            public int Wins { get; set; }

            [JsonProperty("losses")]
            public int Losses { get; set; }

            [JsonProperty("matchesPlayed")]
            public int MatchesPlayed { get; set; }
        }

        #endregion
    }
}
