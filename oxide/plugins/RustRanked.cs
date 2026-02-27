using Newtonsoft.Json;
using Oxide.Core;
using Oxide.Core.Libraries;
using Oxide.Core.Libraries.Covalence;
using System;
using System.Collections.Generic;
using System.Text;

namespace Oxide.Plugins
{
    [Info("RustRanked", "RustRanked", "2.0.0")]
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

            [JsonProperty("Stats API Key")]
            public string StatsApiKey { get; set; } = "YOUR_STATS_API_KEY_HERE";

            [JsonProperty("Server Type")]
            public string ServerType { get; set; } = "US_MAIN";

            [JsonProperty("Wipe ID")]
            public string WipeId { get; set; } = "";

            [JsonProperty("Kick Unverified Players")]
            public bool KickUnverified { get; set; } = true;

            [JsonProperty("Show Welcome Message")]
            public bool ShowWelcome { get; set; } = true;

            [JsonProperty("Check Interval (seconds)")]
            public float CheckInterval { get; set; } = 30f;

            [JsonProperty("Stats Report Interval (seconds)")]
            public float StatsReportInterval { get; set; } = 300f;
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
        private Dictionary<string, PlayerStats> playerStats = new Dictionary<string, PlayerStats>();

        private class PlayerData
        {
            public string UserId { get; set; }
            public string DiscordName { get; set; }
            public string SteamName { get; set; }
            public DateTime VerifiedAt { get; set; }
        }

        private class PlayerStats
        {
            public int Kills { get; set; }
            public int Deaths { get; set; }
            public int Headshots { get; set; }
            public int BulletsFired { get; set; }
            public int BulletsHit { get; set; }
            public int ArrowsFired { get; set; }
            public int ArrowsHit { get; set; }
            public int RocketsLaunched { get; set; }
            public int ExplosivesUsed { get; set; }
            public int WoodGathered { get; set; }
            public int StoneGathered { get; set; }
            public int MetalOreGathered { get; set; }
            public int SulfurOreGathered { get; set; }
            public bool Dirty { get; set; }
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

            // Start periodic stats reporting
            timer.Every(config.StatsReportInterval, ReportAllStats);
        }

        private void OnUserConnected(IPlayer player)
        {
            VerifyPlayer(player);
        }

        private void OnUserDisconnected(IPlayer player)
        {
            // Report stats before removing player
            if (playerStats.ContainsKey(player.Id) && playerStats[player.Id].Dirty)
            {
                ReportPlayerStats(player.Id);
            }
            verifiedPlayers.Remove(player.Id);
            playerStats.Remove(player.Id);
        }

        private void OnPlayerDeath(BasePlayer victim, HitInfo info)
        {
            if (victim == null) return;

            var attacker = info?.InitiatorPlayer;
            if (attacker == null || attacker == victim) return;

            // Track kill for attacker
            var attackerStats = GetOrCreateStats(attacker.UserIDString);
            attackerStats.Kills++;
            if (info.isHeadshot)
            {
                attackerStats.Headshots++;
            }
            attackerStats.Dirty = true;

            // Track death for victim
            var victimStats = GetOrCreateStats(victim.UserIDString);
            victimStats.Deaths++;
            victimStats.Dirty = true;
        }

        private void OnWeaponFired(BaseProjectile projectile, BasePlayer player, ItemModProjectile mod, ProjectileShoot projectiles)
        {
            if (player == null) return;

            var stats = GetOrCreateStats(player.UserIDString);
            stats.BulletsFired += projectiles.projectiles.Count;
            stats.Dirty = true;
        }

        private void OnRocketLaunched(BasePlayer player, BaseEntity entity)
        {
            if (player == null) return;

            var stats = GetOrCreateStats(player.UserIDString);
            stats.RocketsLaunched++;
            stats.Dirty = true;
        }

        private void OnExplosiveThrown(BasePlayer player, BaseEntity entity, ThrownWeapon item)
        {
            if (player == null) return;

            var stats = GetOrCreateStats(player.UserIDString);
            stats.ExplosivesUsed++;
            stats.Dirty = true;
        }

        private void OnDispenserGather(ResourceDispenser dispenser, BaseEntity entity, Item item)
        {
            var player = entity as BasePlayer;
            if (player == null || item == null) return;

            var stats = GetOrCreateStats(player.UserIDString);

            switch (item.info.shortname)
            {
                case "wood":
                    stats.WoodGathered += item.amount;
                    break;
                case "stones":
                    stats.StoneGathered += item.amount;
                    break;
                case "metal.ore":
                    stats.MetalOreGathered += item.amount;
                    break;
                case "sulfur.ore":
                    stats.SulfurOreGathered += item.amount;
                    break;
            }
            stats.Dirty = true;
        }

        private void OnBowFired(BowWeapon bow, BasePlayer player, ItemModProjectile mod, ProjectileShoot projectiles)
        {
            if (player == null) return;

            var stats = GetOrCreateStats(player.UserIDString);
            stats.ArrowsFired += projectiles.projectiles.Count;
            stats.Dirty = true;
        }

        #endregion

        #region Stats Helpers

        private PlayerStats GetOrCreateStats(string steamId)
        {
            if (!playerStats.ContainsKey(steamId))
            {
                playerStats[steamId] = new PlayerStats();
            }
            return playerStats[steamId];
        }

        private void ReportAllStats()
        {
            var batch = new List<object>();

            foreach (var kvp in playerStats)
            {
                if (!kvp.Value.Dirty) continue;

                batch.Add(new
                {
                    steamId = kvp.Key,
                    kills = kvp.Value.Kills,
                    deaths = kvp.Value.Deaths,
                    headshots = kvp.Value.Headshots,
                    bulletsFired = kvp.Value.BulletsFired,
                    bulletsHit = kvp.Value.BulletsHit,
                    arrowsFired = kvp.Value.ArrowsFired,
                    arrowsHit = kvp.Value.ArrowsHit,
                    rocketsLaunched = kvp.Value.RocketsLaunched,
                    explosivesUsed = kvp.Value.ExplosivesUsed,
                    woodGathered = kvp.Value.WoodGathered,
                    stoneGathered = kvp.Value.StoneGathered,
                    metalOreGathered = kvp.Value.MetalOreGathered,
                    sulfurOreGathered = kvp.Value.SulfurOreGathered
                });

                kvp.Value.Dirty = false;
            }

            if (batch.Count == 0) return;

            var headers = new Dictionary<string, string>
            {
                { "Content-Type", "application/json" }
            };

            var body = JsonConvert.SerializeObject(new
            {
                apiKey = config.StatsApiKey,
                wipeId = config.WipeId,
                serverType = config.ServerType,
                players = batch
            });

            webrequest.Enqueue(
                $"{config.ApiUrl}/stats/update",
                body,
                (code, response) =>
                {
                    if (code != 200)
                    {
                        PrintWarning($"Failed to report stats: HTTP {code}");
                    }
                },
                this,
                RequestMethod.PUT,
                headers
            );
        }

        private void ReportPlayerStats(string steamId)
        {
            if (!playerStats.ContainsKey(steamId) || !playerStats[steamId].Dirty) return;

            var stats = playerStats[steamId];

            var headers = new Dictionary<string, string>
            {
                { "Content-Type", "application/json" }
            };

            var body = JsonConvert.SerializeObject(new
            {
                apiKey = config.StatsApiKey,
                steamId,
                serverType = config.ServerType,
                wipeId = config.WipeId,
                kills = stats.Kills,
                deaths = stats.Deaths,
                headshots = stats.Headshots,
                bulletsFired = stats.BulletsFired,
                bulletsHit = stats.BulletsHit,
                arrowsFired = stats.ArrowsFired,
                arrowsHit = stats.ArrowsHit,
                rocketsLaunched = stats.RocketsLaunched,
                explosivesUsed = stats.ExplosivesUsed,
                woodGathered = stats.WoodGathered,
                stoneGathered = stats.StoneGathered,
                metalOreGathered = stats.MetalOreGathered,
                sulfurOreGathered = stats.SulfurOreGathered
            });

            webrequest.Enqueue(
                $"{config.ApiUrl}/stats/update",
                body,
                (code, response) =>
                {
                    if (code != 200)
                    {
                        PrintWarning($"Failed to report stats for {steamId}: HTTP {code}");
                    }
                },
                this,
                RequestMethod.POST,
                headers
            );

            stats.Dirty = false;
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
                    VerifiedAt = DateTime.UtcNow
                };

                Puts($"Player {player.Name} verified successfully");

                if (config.ShowWelcome)
                {
                    player.Message($"<color=#cd4832>[RustRanked]</color> Welcome, {player.Name}! You are verified and ready to play.");
                }
            }
            catch (Exception ex)
            {
                PrintError($"Error parsing verify response: {ex.Message}");
            }
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
            sb.AppendLine("<color=#888>/rr verify</color> - Re-verify your account");
            sb.AppendLine("<color=#888>Visit rustranked.com/leaderboard for stats</color>");
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
        }

        #endregion
    }
}
