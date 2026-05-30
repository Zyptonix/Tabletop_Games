import path from "node:path";
import { fileURLToPath } from "node:url";
import argon2 from "argon2";
import dotenv from "dotenv";
import { prisma } from "../src/client";

const seedDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(seedDir, "../../..", ".env") });
dotenv.config({ path: path.resolve(seedDir, "..", ".env"), override: false });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required to seed the admin account.`);
  }
  return value;
}

function levelFromXp(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}

async function main() {
  const username = required("ADMIN_USERNAME");
  const password = required("ADMIN_PASSWORD");
  const email = process.env.ADMIN_EMAIL ?? null;
  const passwordHash = await argon2.hash(password);

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      email,
      passwordHash,
      role: "ADMIN"
    },
    create: {
      username,
      email,
      passwordHash,
      role: "ADMIN"
    }
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      displayName: username,
      level: levelFromXp(0)
    },
    create: {
      userId: user.id,
      displayName: username,
      level: levelFromXp(0)
    }
  });

  await prisma.achievement.upsert({
    where: { code: "founder" },
    update: {},
    create: {
      code: "founder",
      title: "Founder",
      description: "Seeded the private tabletop server."
    }
  });

  console.log(`Seeded admin user: ${username}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
