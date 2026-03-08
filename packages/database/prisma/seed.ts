import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const servers = [
  // US Region
  { slug: "us-main", name: "US Main", region: "US", category: "Main", teamLimit: null, wipeSchedule: "Thursdays 2pm EST", mapSize: 4250, maxPlayers: 300, displayOrder: 1 },
  { slug: "us-monthly", name: "US Monthly", region: "US", category: "Monthly", teamLimit: null, wipeSchedule: "1st Thursday 2pm EST", mapSize: 4250, maxPlayers: 300, displayOrder: 2 },
  { slug: "us-biweekly", name: "US Biweekly", region: "US", category: "Biweekly", teamLimit: null, wipeSchedule: "Every other Thursday 2pm EST", mapSize: 4000, maxPlayers: 250, displayOrder: 3 },
  { slug: "us-small", name: "US Small", region: "US", category: "Small", teamLimit: 4, wipeSchedule: "Thursdays 2pm EST", mapSize: 3000, maxPlayers: 200, displayOrder: 4 },
  { slug: "us-medium", name: "US Medium", region: "US", category: "Medium", teamLimit: 6, wipeSchedule: "Thursdays 2pm EST", mapSize: 3500, maxPlayers: 250, displayOrder: 5 },
  { slug: "us-low-pop", name: "US Low Pop", region: "US", category: "Low Pop", teamLimit: null, wipeSchedule: "Thursdays 2pm EST", mapSize: 3000, maxPlayers: 150, displayOrder: 6 },
  { slug: "us-long", name: "US Long", region: "US", category: "Long", teamLimit: null, wipeSchedule: "1st Thursday 2pm EST", mapSize: 4500, maxPlayers: 300, displayOrder: 7 },
  { slug: "us-mondays", name: "US Mondays", region: "US", category: "Mondays", teamLimit: null, wipeSchedule: "Mondays 2pm EST", mapSize: 4000, maxPlayers: 250, displayOrder: 8 },
  { slug: "us-mini", name: "US Mini", region: "US", category: "Mini", teamLimit: 3, wipeSchedule: "Thursdays 2pm EST", mapSize: 2500, maxPlayers: 150, displayOrder: 9 },

  // EU Region
  { slug: "eu-main", name: "EU Main", region: "EU", category: "Main", teamLimit: null, wipeSchedule: "Thursdays 2pm CET", mapSize: 4250, maxPlayers: 300, displayOrder: 10 },
  { slug: "eu-monthly", name: "EU Monthly", region: "EU", category: "Monthly", teamLimit: null, wipeSchedule: "1st Thursday 2pm CET", mapSize: 4250, maxPlayers: 300, displayOrder: 11 },
  { slug: "eu-biweekly", name: "EU Biweekly", region: "EU", category: "Biweekly", teamLimit: null, wipeSchedule: "Every other Thursday 2pm CET", mapSize: 4000, maxPlayers: 250, displayOrder: 12 },
  { slug: "eu-small", name: "EU Small", region: "EU", category: "Small", teamLimit: 4, wipeSchedule: "Thursdays 2pm CET", mapSize: 3000, maxPlayers: 200, displayOrder: 13 },
  { slug: "eu-medium", name: "EU Medium", region: "EU", category: "Medium", teamLimit: 6, wipeSchedule: "Thursdays 2pm CET", mapSize: 3500, maxPlayers: 250, displayOrder: 14 },
  { slug: "eu-long", name: "EU Long", region: "EU", category: "Long", teamLimit: null, wipeSchedule: "1st Thursday 2pm CET", mapSize: 4500, maxPlayers: 300, displayOrder: 15 },
  { slug: "eu-mondays", name: "EU Mondays", region: "EU", category: "Mondays", teamLimit: null, wipeSchedule: "Mondays 2pm CET", mapSize: 4000, maxPlayers: 250, displayOrder: 16 },
  { slug: "eu-mini", name: "EU Mini", region: "EU", category: "Mini", teamLimit: 3, wipeSchedule: "Thursdays 2pm CET", mapSize: 2500, maxPlayers: 150, displayOrder: 17 },

  // SEA Region
  { slug: "sea-main", name: "SEA Main", region: "SEA", category: "Main", teamLimit: null, wipeSchedule: "Thursdays 2pm SGT", mapSize: 4250, maxPlayers: 250, displayOrder: 18 },
];

async function main() {
  console.log("Seeding servers...");

  for (const server of servers) {
    await prisma.gameServer.upsert({
      where: { slug: server.slug },
      update: {
        name: server.name,
        region: server.region,
        category: server.category,
        teamLimit: server.teamLimit,
        wipeSchedule: server.wipeSchedule,
        mapSize: server.mapSize,
        maxPlayers: server.maxPlayers,
        displayOrder: server.displayOrder,
      },
      create: {
        name: server.name,
        slug: server.slug,
        region: server.region,
        category: server.category,
        teamLimit: server.teamLimit,
        wipeSchedule: server.wipeSchedule,
        mapSize: server.mapSize,
        maxPlayers: server.maxPlayers,
        displayOrder: server.displayOrder,
        ip: "0.0.0.0",
        port: 28015 + server.displayOrder,
        apiKeyHash: `placeholder-${server.slug}`,
      },
    });
    console.log(`  Upserted: ${server.name}`);
  }

  console.log(`Seeded ${servers.length} servers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
