using Newtonsoft.Json;
using Oxide.Core;
using Oxide.Core.Libraries;
using Oxide.Core.Libraries.Covalence;
using System;
using System.Collections.Generic;
using System.Text;

namespace Oxide.Plugins
{
    [Info("RustRanked", "RustRanked", "4.0.0")]
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
        private Dictionary<string, DateTime> playerConnectTimes = new Dictionary<string, DateTime>();

        private class PlayerData
        {
            public string UserId { get; set; }
            public string DiscordName { get; set; }
            public string SteamName { get; set; }
            public DateTime VerifiedAt { get; set; }
            public int SeasonLevel { get; set; }
            public int SeasonXp { get; set; }
            public bool HasPremium { get; set; }
            public bool HasVip { get; set; }
        }

        private class PlayerStats
        {
            // PvP
            public int Kills { get; set; }
            public int Deaths { get; set; }
            public int Headshots { get; set; }
            public int BulletsFired { get; set; }
            public int BulletsHit { get; set; }
            public int ArrowsFired { get; set; }
            public int ArrowsHit { get; set; }
            public int Suicides { get; set; }
            public int TimesWounded { get; set; }
            public int WoundedRecoveries { get; set; }
            public int SyringesUsed { get; set; }
            public int BandagesUsed { get; set; }
            public int MedkitsUsed { get; set; }

            // PvE
            public int AnimalKills { get; set; }
            public int NpcKills { get; set; }

            // Raiding / Boom
            public int RocketsLaunched { get; set; }
            public int ExplosivesUsed { get; set; }
            public int C4Used { get; set; }
            public int SatchelsUsed { get; set; }
            public int ExplosiveAmmoUsed { get; set; }

            // Resources
            public int WoodGathered { get; set; }
            public int StoneGathered { get; set; }
            public int MetalOreGathered { get; set; }
            public int SulfurOreGathered { get; set; }
            public int ResourcesGathered { get; set; }

            // Building
            public int BlocksPlaced { get; set; }
            public int BlocksUpgraded { get; set; }

            // Looting
            public int CratesLooted { get; set; }
            public int BarrelsLooted { get; set; }

            // Recycling
            public int ItemsRecycled { get; set; }

            // Gambling
            public int ScrapGambled { get; set; }
            public int ScrapWon { get; set; }

            // Vehicles
            public int BoatsSpawned { get; set; }
            public int MinisSpawned { get; set; }

            // Vehicle Combat
            public int VehicleKills { get; set; }

            // Fishing
            public int FishCaught { get; set; }

            // Time
            public float HoursPlayed { get; set; }

            public bool Dirty { get; set; }
        }

        private Dictionary<string, PlayerXpAccumulator> playerXp = new Dictionary<string, PlayerXpAccumulator>();

        private class PlayerXpAccumulator
        {
            public List<XpEntry> Entries { get; set; } = new List<XpEntry>();
            public bool Dirty { get; set; }
        }

        private class XpEntry
        {
            public string Source { get; set; }
            public int Amount { get; set; }
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
                playerConnectTimes[player.Id] = DateTime.UtcNow;
            }

            // Start periodic stats and XP reporting
            timer.Every(config.StatsReportInterval, () =>
            {
                UpdateAllPlaytimes();
                ReportAllStats();
                ReportAllXp();
            });
        }

        private void OnUserConnected(IPlayer player)
        {
            VerifyPlayer(player);
            playerConnectTimes[player.Id] = DateTime.UtcNow;
        }

        private void OnUserDisconnected(IPlayer player)
        {
            // Calculate final session playtime
            UpdatePlaytime(player.Id);

            // Report stats and XP before removing player
            if (playerStats.ContainsKey(player.Id) && playerStats[player.Id].Dirty)
            {
                ReportPlayerStats(player.Id);
            }
            if (playerXp.ContainsKey(player.Id) && playerXp[player.Id].Dirty)
            {
                ReportPlayerXp(player.Id);
            }
            verifiedPlayers.Remove(player.Id);
            playerStats.Remove(player.Id);
            playerXp.Remove(player.Id);
            playerConnectTimes.Remove(player.Id);
        }

        // --- PvP ---

        private void OnPlayerDeath(BasePlayer victim, HitInfo info)
        {
            if (victim == null) return;

            var attacker = info?.InitiatorPlayer;

            // Suicide check
            if (attacker == null || attacker == victim)
            {
                var victimStats = GetOrCreateStats(victim.UserIDString);
                victimStats.Deaths++;
                victimStats.Suicides++;
                victimStats.Dirty = true;
                var victimXp = GetOrCreateXp(victim.UserIDString);
                victimXp.Entries.Add(new XpEntry { Source = "death", Amount = 5 });
                victimXp.Dirty = true;
                return;
            }

            // Track kill for attacker
            var attackerStats = GetOrCreateStats(attacker.UserIDString);
            attackerStats.Kills++;
            var attackerXp = GetOrCreateXp(attacker.UserIDString);
            if (info.isHeadshot)
            {
                attackerStats.Headshots++;
                attackerXp.Entries.Add(new XpEntry { Source = "headshot_kill", Amount = 75 });
            }
            else
            {
                attackerXp.Entries.Add(new XpEntry { Source = "kill", Amount = 50 });
            }
            attackerXp.Dirty = true;
            attackerStats.Dirty = true;

            // Track death for victim
            var deathStats = GetOrCreateStats(victim.UserIDString);
            deathStats.Deaths++;
            deathStats.Dirty = true;
            var deathXp = GetOrCreateXp(victim.UserIDString);
            deathXp.Entries.Add(new XpEntry { Source = "death", Amount = 5 });
            deathXp.Dirty = true;
        }

        private void OnPlayerWound(BasePlayer player)
        {
            if (player == null) return;
            var stats = GetOrCreateStats(player.UserIDString);
            stats.TimesWounded++;
            stats.Dirty = true;
        }

        private void OnPlayerRecover(BasePlayer player)
        {
            if (player == null) return;
            var stats = GetOrCreateStats(player.UserIDString);
            stats.WoundedRecoveries++;
            stats.Dirty = true;
        }

        // --- Weapons & Accuracy ---

        private void OnWeaponFired(BaseProjectile projectile, BasePlayer player, ItemModProjectile mod)
        {
            if (player == null) return;

            var stats = GetOrCreateStats(player.UserIDString);
            stats.BulletsFired++;

            // Check for explosive ammo
            if (mod?.projectileObject != null)
            {
                var ammo = projectile?.primaryMagazine?.ammoType;
                if (ammo != null && ammo.shortname == "ammo.rifle.explosive")
                {
                    stats.ExplosiveAmmoUsed++;
                }
            }

            stats.Dirty = true;
        }

        private void OnEntityTakeDamage(BaseCombatEntity entity, HitInfo info)
        {
            if (entity == null || info == null) return;
            var attacker = info.InitiatorPlayer;
            if (attacker == null) return;

            // Only track hits on players
            if (!(entity is BasePlayer target) || target == attacker) return;

            var weapon = info.Weapon?.GetItem()?.GetHeldEntity();
            if (weapon == null) return;

            var stats = GetOrCreateStats(attacker.UserIDString);

            if (weapon is BaseProjectile)
            {
                stats.BulletsHit++;
                stats.Dirty = true;
            }
        }

        private void OnBowFired(BowWeapon bow, BasePlayer player, ItemModProjectile mod)
        {
            if (player == null) return;

            var stats = GetOrCreateStats(player.UserIDString);
            stats.ArrowsFired++;
            stats.Dirty = true;
        }

        // --- Healing Items ---

        private void OnItemUse(Item item, int amountToUse)
        {
            if (item?.parent?.playerOwner == null) return;
            var player = item.parent.playerOwner;
            var stats = GetOrCreateStats(player.UserIDString);

            switch (item.info.shortname)
            {
                case "syringe.medical":
                    stats.SyringesUsed++;
                    stats.Dirty = true;
                    break;
                case "bandage":
                    stats.BandagesUsed++;
                    stats.Dirty = true;
                    break;
                case "largemedkit":
                    stats.MedkitsUsed++;
                    stats.Dirty = true;
                    break;
            }
        }

        // --- PvE / Entity Deaths ---

        private void OnEntityDeath(BaseCombatEntity entity, HitInfo info)
        {
            if (entity == null || info == null) return;
            var attacker = info.InitiatorPlayer;
            if (attacker == null) return;

            var stats = GetOrCreateStats(attacker.UserIDString);

            // Animal kills
            if (entity is BaseAnimalNPC)
            {
                stats.AnimalKills++;
                stats.Dirty = true;
                var xp = GetOrCreateXp(attacker.UserIDString);
                xp.Entries.Add(new XpEntry { Source = "animal_kill", Amount = 10 });
                xp.Dirty = true;
                return;
            }

            // NPC kills (scientists, tunnel dwellers, etc.)
            if (entity is NPCPlayer || entity is global::HTNPlayer)
            {
                stats.NpcKills++;
                stats.Dirty = true;
                return;
            }

            // Vehicle kills (vehicle with occupants)
            if (entity is BaseVehicle vehicle)
            {
                if (vehicle.HasDriver() || (vehicle is BaseVehicleSeat))
                {
                    stats.VehicleKills++;
                    stats.Dirty = true;
                }
                return;
            }
        }

        // --- Resources ---

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

            // Compute total resourcesGathered
            stats.ResourcesGathered = stats.WoodGathered + stats.StoneGathered
                + stats.MetalOreGathered + stats.SulfurOreGathered;
            stats.Dirty = true;

            // Award XP per 1000 resources (batched)
            var xp = GetOrCreateXp(player.UserIDString);
            if (item.amount >= 1000)
            {
                int batches = item.amount / 1000;
                xp.Entries.Add(new XpEntry { Source = "resources", Amount = batches * 12 });
                xp.Dirty = true;
            }
        }

        // --- Raiding / Boom ---

        private void OnRocketLaunched(BasePlayer player, BaseEntity entity)
        {
            if (player == null) return;

            var stats = GetOrCreateStats(player.UserIDString);
            stats.RocketsLaunched++;
            stats.ExplosivesUsed++;
            stats.Dirty = true;
            var xp = GetOrCreateXp(player.UserIDString);
            xp.Entries.Add(new XpEntry { Source = "rocket", Amount = 17 });
            xp.Dirty = true;
        }

        private void OnExplosiveThrown(BasePlayer player, BaseEntity entity, ThrownWeapon item)
        {
            if (player == null) return;

            var stats = GetOrCreateStats(player.UserIDString);

            var prefabName = entity?.ShortPrefabName ?? "";
            if (prefabName.Contains("explosive.timed"))
            {
                stats.C4Used++;
            }
            else if (prefabName.Contains("explosive.satchel"))
            {
                stats.SatchelsUsed++;
            }

            stats.ExplosivesUsed++;
            stats.Dirty = true;
            var xp = GetOrCreateXp(player.UserIDString);
            xp.Entries.Add(new XpEntry { Source = "explosive", Amount = 17 });
            xp.Dirty = true;
        }

        // --- Building ---

        private void OnEntityBuilt(Planner planner, UnityEngine.GameObject go)
        {
            var player = planner?.GetOwnerPlayer();
            if (player == null) return;

            var stats = GetOrCreateStats(player.UserIDString);
            stats.BlocksPlaced++;
            stats.Dirty = true;
        }

        private void OnStructureUpgrade(BuildingBlock block, BasePlayer player, BuildingGrade.Enum grade)
        {
            if (player == null) return;

            var stats = GetOrCreateStats(player.UserIDString);
            stats.BlocksUpgraded++;
            stats.Dirty = true;
        }

        // --- Looting ---

        private void OnLootEntity(BasePlayer player, BaseEntity entity)
        {
            if (player == null || entity == null) return;

            var stats = GetOrCreateStats(player.UserIDString);
            var prefabName = entity.ShortPrefabName ?? "";

            if (prefabName.Contains("crate") || prefabName.Contains("heli_crate") ||
                prefabName.Contains("supply_drop") || prefabName.Contains("bradley_crate"))
            {
                stats.CratesLooted++;
                stats.Dirty = true;
            }
            else if (prefabName.Contains("barrel") || prefabName.Contains("loot-barrel") ||
                     prefabName.Contains("loot_barrel"))
            {
                stats.BarrelsLooted++;
                stats.Dirty = true;
            }
        }

        // --- Recycling ---

        private void OnRecycleItem(Recycler recycler, Item item)
        {
            if (recycler == null || item == null) return;

            // Find the player using the recycler
            var player = BasePlayer.FindByID(recycler.OwnerID);
            if (player == null) return;

            var stats = GetOrCreateStats(player.UserIDString);
            stats.ItemsRecycled++;
            stats.Dirty = true;
        }

        // --- Vehicles ---

        private void OnEntitySpawned(BaseNetworkable entity)
        {
            if (entity == null) return;

            if (entity is BaseBoat boat)
            {
                var ownerIdStr = boat.OwnerID.ToString();
                if (boat.OwnerID != 0)
                {
                    var stats = GetOrCreateStats(ownerIdStr);
                    stats.BoatsSpawned++;
                    stats.Dirty = true;
                }
            }
            else if (entity is MiniCopter mini)
            {
                var ownerIdStr = mini.OwnerID.ToString();
                if (mini.OwnerID != 0)
                {
                    var stats = GetOrCreateStats(ownerIdStr);
                    stats.MinisSpawned++;
                    stats.Dirty = true;
                }
            }
        }

        // --- Fishing ---

        private void OnItemAddedToContainer(ItemContainer container, Item item)
        {
            if (container?.playerOwner == null || item == null) return;

            if (item.info.shortname.StartsWith("fish."))
            {
                var stats = GetOrCreateStats(container.playerOwner.UserIDString);
                stats.FishCaught += item.amount;
                stats.Dirty = true;
                var xp = GetOrCreateXp(container.playerOwner.UserIDString);
                xp.Entries.Add(new XpEntry { Source = "fish", Amount = item.amount * 5 });
                xp.Dirty = true;
            }
        }

        // --- Gambling ---

        private void OnSpinWheel(BasePlayer player, BigWheelGame wheel)
        {
            if (player == null) return;
            // BigWheelGame costs 10 scrap per spin
            var stats = GetOrCreateStats(player.UserIDString);
            stats.ScrapGambled += 10;
            stats.Dirty = true;
        }

        private void OnBigWheelWin(BasePlayer player, int multiplier, int amount)
        {
            if (player == null) return;
            var stats = GetOrCreateStats(player.UserIDString);
            stats.ScrapWon += amount;
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

        private PlayerXpAccumulator GetOrCreateXp(string steamId)
        {
            if (!playerXp.ContainsKey(steamId))
            {
                playerXp[steamId] = new PlayerXpAccumulator();
            }
            return playerXp[steamId];
        }

        private void UpdatePlaytime(string steamId)
        {
            if (!playerConnectTimes.ContainsKey(steamId)) return;

            var connectTime = playerConnectTimes[steamId];
            var sessionHours = (float)(DateTime.UtcNow - connectTime).TotalHours;
            if (sessionHours <= 0) return;

            var stats = GetOrCreateStats(steamId);
            stats.HoursPlayed += sessionHours;
            stats.Dirty = true;

            // Reset connect time to now for next interval
            playerConnectTimes[steamId] = DateTime.UtcNow;
        }

        private void UpdateAllPlaytimes()
        {
            foreach (var player in players.Connected)
            {
                UpdatePlaytime(player.Id);
            }
        }

        private object BuildStatsPayload(string steamId, PlayerStats stats)
        {
            return new
            {
                steamId,
                kills = stats.Kills,
                deaths = stats.Deaths,
                headshots = stats.Headshots,
                bulletsFired = stats.BulletsFired,
                bulletsHit = stats.BulletsHit,
                arrowsFired = stats.ArrowsFired,
                arrowsHit = stats.ArrowsHit,
                suicides = stats.Suicides,
                timesWounded = stats.TimesWounded,
                woundedRecoveries = stats.WoundedRecoveries,
                syringesUsed = stats.SyringesUsed,
                bandagesUsed = stats.BandagesUsed,
                medkitsUsed = stats.MedkitsUsed,
                animalKills = stats.AnimalKills,
                npcKills = stats.NpcKills,
                rocketsLaunched = stats.RocketsLaunched,
                explosivesUsed = stats.ExplosivesUsed,
                c4Used = stats.C4Used,
                satchelsUsed = stats.SatchelsUsed,
                explosiveAmmoUsed = stats.ExplosiveAmmoUsed,
                woodGathered = stats.WoodGathered,
                stoneGathered = stats.StoneGathered,
                metalOreGathered = stats.MetalOreGathered,
                sulfurOreGathered = stats.SulfurOreGathered,
                resourcesGathered = stats.ResourcesGathered,
                blocksPlaced = stats.BlocksPlaced,
                blocksUpgraded = stats.BlocksUpgraded,
                cratesLooted = stats.CratesLooted,
                barrelsLooted = stats.BarrelsLooted,
                itemsRecycled = stats.ItemsRecycled,
                scrapGambled = stats.ScrapGambled,
                scrapWon = stats.ScrapWon,
                boatsSpawned = stats.BoatsSpawned,
                minisSpawned = stats.MinisSpawned,
                vehicleKills = stats.VehicleKills,
                fishCaught = stats.FishCaught,
                hoursPlayed = stats.HoursPlayed
            };
        }

        private void ReportAllStats()
        {
            var batch = new List<object>();

            foreach (var kvp in playerStats)
            {
                if (!kvp.Value.Dirty) continue;
                batch.Add(BuildStatsPayload(kvp.Key, kvp.Value));
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

            var payload = BuildStatsPayload(steamId, stats);
            // Merge top-level fields for single-player POST
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
                suicides = stats.Suicides,
                timesWounded = stats.TimesWounded,
                woundedRecoveries = stats.WoundedRecoveries,
                syringesUsed = stats.SyringesUsed,
                bandagesUsed = stats.BandagesUsed,
                medkitsUsed = stats.MedkitsUsed,
                animalKills = stats.AnimalKills,
                npcKills = stats.NpcKills,
                rocketsLaunched = stats.RocketsLaunched,
                explosivesUsed = stats.ExplosivesUsed,
                c4Used = stats.C4Used,
                satchelsUsed = stats.SatchelsUsed,
                explosiveAmmoUsed = stats.ExplosiveAmmoUsed,
                woodGathered = stats.WoodGathered,
                stoneGathered = stats.StoneGathered,
                metalOreGathered = stats.MetalOreGathered,
                sulfurOreGathered = stats.SulfurOreGathered,
                resourcesGathered = stats.ResourcesGathered,
                blocksPlaced = stats.BlocksPlaced,
                blocksUpgraded = stats.BlocksUpgraded,
                cratesLooted = stats.CratesLooted,
                barrelsLooted = stats.BarrelsLooted,
                itemsRecycled = stats.ItemsRecycled,
                scrapGambled = stats.ScrapGambled,
                scrapWon = stats.ScrapWon,
                boatsSpawned = stats.BoatsSpawned,
                minisSpawned = stats.MinisSpawned,
                vehicleKills = stats.VehicleKills,
                fishCaught = stats.FishCaught,
                hoursPlayed = stats.HoursPlayed
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

        private void ReportAllXp()
        {
            var batch = new List<object>();

            foreach (var kvp in playerXp)
            {
                if (!kvp.Value.Dirty || kvp.Value.Entries.Count == 0) continue;

                var entries = new List<object>();
                foreach (var entry in kvp.Value.Entries)
                {
                    entries.Add(new { source = entry.Source, amount = entry.Amount });
                }

                batch.Add(new
                {
                    steamId = kvp.Key,
                    entries
                });

                kvp.Value.Entries.Clear();
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
                players = batch
            });

            webrequest.Enqueue(
                $"{config.ApiUrl}/xp/batch-award",
                body,
                (code, response) =>
                {
                    if (code == 200)
                    {
                        try
                        {
                            var result = JsonConvert.DeserializeObject<XpBatchResponse>(response);
                            if (result?.Players != null)
                            {
                                foreach (var p in result.Players)
                                {
                                    if (p.LeveledUp && verifiedPlayers.ContainsKey(p.SteamId))
                                    {
                                        verifiedPlayers[p.SteamId].SeasonLevel = p.NewLevel;
                                        verifiedPlayers[p.SteamId].SeasonXp = p.NewXp;

                                        var player = players.FindPlayerById(p.SteamId);
                                        if (player != null && player.IsConnected)
                                        {
                                            player.Message($"<color=#cd4832>[RustRanked]</color> <color=#4ade80>Level Up!</color> You reached <color=#fbbf24>Level {p.NewLevel}</color>!");
                                        }
                                    }
                                }
                            }
                        }
                        catch { }
                    }
                    else
                    {
                        PrintWarning($"Failed to report XP batch: HTTP {code}");
                    }
                },
                this,
                RequestMethod.PUT,
                headers
            );
        }

        private void ReportPlayerXp(string steamId)
        {
            if (!playerXp.ContainsKey(steamId) || !playerXp[steamId].Dirty) return;

            var xp = playerXp[steamId];
            if (xp.Entries.Count == 0) return;

            var entries = new List<object>();
            foreach (var entry in xp.Entries)
            {
                entries.Add(new { source = entry.Source, amount = entry.Amount });
            }

            var headers = new Dictionary<string, string>
            {
                { "Content-Type", "application/json" }
            };

            var body = JsonConvert.SerializeObject(new
            {
                apiKey = config.StatsApiKey,
                players = new[] { new { steamId, entries } }
            });

            webrequest.Enqueue(
                $"{config.ApiUrl}/xp/batch-award",
                body,
                (code, response) =>
                {
                    if (code != 200)
                    {
                        PrintWarning($"Failed to report XP for {steamId}: HTTP {code}");
                    }
                },
                this,
                RequestMethod.PUT,
                headers
            );

            xp.Entries.Clear();
            xp.Dirty = false;
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

            var body = JsonConvert.SerializeObject(new { steamId, playerName = player.Name });

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

                // Store verified player data with season info
                verifiedPlayers[player.Id] = new PlayerData
                {
                    UserId = result.Player.Id,
                    DiscordName = result.Player.DiscordName,
                    SteamName = result.Player.SteamName,
                    VerifiedAt = DateTime.UtcNow,
                    SeasonLevel = result.SeasonLevel,
                    SeasonXp = result.SeasonXp,
                    HasPremium = result.HasPremium,
                    HasVip = result.HasVip
                };

                Puts($"Player {player.Name} verified successfully (Lv.{result.SeasonLevel}{(result.HasVip ? ", VIP" : "")})");


                if (config.ShowWelcome)
                {
                    var levelInfo = result.SeasonLevel > 0 ? $" | Level {result.SeasonLevel}" : "";
                    var vipInfo = result.HasVip ? " | <color=#fbbf24>VIP</color>" : "";
                    player.Message($"<color=#cd4832>[RustRanked]</color> Welcome, {player.Name}!{levelInfo}{vipInfo} You are verified and ready to play.");
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
                case "bp":
                case "battlepass":
                    ShowBattlePass(player);
                    break;
                default:
                    ShowHelp(player);
                    break;
            }
        }

        private void ShowBattlePass(IPlayer player)
        {
            if (!verifiedPlayers.ContainsKey(player.Id))
            {
                player.Message("<color=#cd4832>[RustRanked]</color> You need to verify first. Use <color=#888>/rr verify</color>");
                return;
            }

            var data = verifiedPlayers[player.Id];
            var sb = new StringBuilder();
            sb.AppendLine("<color=#cd4832>=== Battle Pass ===</color>");
            sb.AppendLine($"<color=#fbbf24>Level {data.SeasonLevel}</color> | XP: {data.SeasonXp:N0}");
            if (data.HasVip) sb.AppendLine("<color=#fbbf24>VIP Active</color>");
            sb.AppendLine("<color=#888>Visit rustranked.com/battle-pass for details</color>");
            player.Message(sb.ToString());
        }

        private void ShowHelp(IPlayer player)
        {
            var sb = new StringBuilder();
            sb.AppendLine("<color=#cd4832>=== RustRanked Commands ===</color>");
            sb.AppendLine("<color=#888>/rr verify</color> - Re-verify your account");
            sb.AppendLine("<color=#888>/rr bp</color> - Show battle pass progress");
            sb.AppendLine("<color=#888>Visit rustranked.com/leaderboard for stats</color>");
            player.Message(sb.ToString());
        }

        // Public API for queue plugins
        public bool IsVip(string steamId)
        {
            return verifiedPlayers.ContainsKey(steamId) && verifiedPlayers[steamId].HasVip;
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

            [JsonProperty("seasonLevel")]
            public int SeasonLevel { get; set; }

            [JsonProperty("seasonXp")]
            public int SeasonXp { get; set; }

            [JsonProperty("hasPremium")]
            public bool HasPremium { get; set; }

            [JsonProperty("hasVip")]
            public bool HasVip { get; set; }
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

        private class XpBatchResponse
        {
            [JsonProperty("success")]
            public bool Success { get; set; }

            [JsonProperty("updated")]
            public int Updated { get; set; }

            [JsonProperty("players")]
            public List<XpBatchPlayerResult> Players { get; set; }
        }

        private class XpBatchPlayerResult
        {
            [JsonProperty("steamId")]
            public string SteamId { get; set; }

            [JsonProperty("newLevel")]
            public int NewLevel { get; set; }

            [JsonProperty("newXp")]
            public int NewXp { get; set; }

            [JsonProperty("leveledUp")]
            public bool LeveledUp { get; set; }
        }

        #endregion
    }
}
