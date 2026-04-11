/**
 * Seed the database with major Chennai cinemas and their GPS coordinates.
 * Run: npx tsx seed-cinemas.ts
 *
 * Cinemas are upserted (safe to run multiple times).
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedCinema {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  chain: string;
  city: string;
  active: boolean;
}

const cinemas: SeedCinema[] = [
  // ── PVR / INOX Cinemas ────────────────────────────────────────────────────
  {
    id: 'chennai-pvr-palladium',
    name: 'PVR INOX - Palladium (Phoenix MarketCity, Velachery)',
    latitude: 12.9823,
    longitude: 80.2207,
    radius: 150,
    chain: 'PVR INOX',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-pvr-ampa-skywalk',
    name: 'PVR INOX - Ampa Skywalk (Aminjikarai)',
    latitude: 13.0694,
    longitude: 80.2224,
    radius: 150,
    chain: 'PVR INOX',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-inox-marina-mall',
    name: 'INOX - The Marina Mall (OMR)',
    latitude: 12.8386,
    longitude: 80.2265,
    radius: 150,
    chain: 'PVR INOX',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-pvr-grand-galada',
    name: 'PVR INOX - Grand Galada (Pallavaram)',
    latitude: 12.9667,
    longitude: 80.1500,
    radius: 150,
    chain: 'PVR INOX',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-pvr-forum-vijaya',
    name: 'PVR INOX - Forum Vijaya Mall (Vadapalani)',
    latitude: 13.0500,
    longitude: 80.2117,
    radius: 150,
    chain: 'PVR INOX',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-pvr-ecr',
    name: 'PVR INOX - ECR (East Coast Road)',
    latitude: 12.8410,
    longitude: 80.2438,
    radius: 150,
    chain: 'PVR INOX',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-pvr-vr-mall',
    name: 'PVR INOX - VR Mall (Anna Nagar)',
    latitude: 13.0878,
    longitude: 80.2101,
    radius: 150,
    chain: 'PVR INOX',
    city: 'Chennai',
    active: true,
  },

  // ── SPI Cinemas ───────────────────────────────────────────────────────────
  {
    id: 'chennai-spi-s2-perambur',
    name: 'SPI S2 - Perambur',
    latitude: 13.1097,
    longitude: 80.2434,
    radius: 150,
    chain: 'SPI Cinemas',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-spi-palazzo-chrompet',
    name: 'SPI Palazzo - Forum Mall Chrompet',
    latitude: 12.9517,
    longitude: 80.1415,
    radius: 150,
    chain: 'SPI Cinemas',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-spi-escape-express-avenue',
    name: 'SPI Escape - Express Avenue (Royapettah)',
    latitude: 13.0598,
    longitude: 80.2644,
    radius: 150,
    chain: 'SPI Cinemas',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-spi-luxe-phoenix',
    name: 'SPI Cinema - Luxe (Phoenix Marketcity)',
    latitude: 12.9823,
    longitude: 80.2207,
    radius: 150,
    chain: 'SPI Cinemas',
    city: 'Chennai',
    active: true,
  },

  // ── Rohini Cinemas ────────────────────────────────────────────────────────
  {
    id: 'chennai-rohini-koyambedu',
    name: 'Rohini Silver Screens (Koyambedu)',
    latitude: 13.0694,
    longitude: 80.1948,
    radius: 150,
    chain: 'Rohini Cinemas',
    city: 'Chennai',
    active: true,
  },

  // ── Sathyam Cinemas ───────────────────────────────────────────────────────
  {
    id: 'chennai-sathyam-royapettah',
    name: 'Sathyam Cinemas - Royapettah',
    latitude: 13.0510,
    longitude: 80.2640,
    radius: 150,
    chain: 'Sathyam Cinemas',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-escape-express-avenue',
    name: 'Escape Cinemas - Express Avenue',
    latitude: 13.0598,
    longitude: 80.2644,
    radius: 150,
    chain: 'Sathyam Cinemas',
    city: 'Chennai',
    active: true,
  },

  // ── AGS Cinemas ───────────────────────────────────────────────────────────
  {
    id: 'chennai-ags-tnagar',
    name: 'AGS Cinemas - T. Nagar',
    latitude: 13.0400,
    longitude: 80.2340,
    radius: 150,
    chain: 'AGS Cinemas',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-ags-villivakkam',
    name: 'AGS Cinemas - Villivakkam',
    latitude: 13.1073,
    longitude: 80.2134,
    radius: 150,
    chain: 'AGS Cinemas',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-ags-maduravoyal',
    name: 'AGS Cinemas - Maduravoyal',
    latitude: 13.0600,
    longitude: 80.1700,
    radius: 150,
    chain: 'AGS Cinemas',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-ags-omr-navalur',
    name: 'AGS Cinemas - OMR (Navalur)',
    latitude: 12.8453,
    longitude: 80.2272,
    radius: 150,
    chain: 'AGS Cinemas',
    city: 'Chennai',
    active: true,
  },

  // ── Kamala Cinemas ────────────────────────────────────────────────────────
  {
    id: 'chennai-kamala-vadapalani',
    name: 'Kamala Cinemas - Vadapalani',
    latitude: 13.0498,
    longitude: 80.2126,
    radius: 150,
    chain: 'Kamala Cinemas',
    city: 'Chennai',
    active: true,
  },

  // ── Vetri Theatres ────────────────────────────────────────────────────────
  {
    id: 'chennai-vetri-chromepet',
    name: 'Vetri Theatre - Chromepet',
    latitude: 12.9486,
    longitude: 80.1394,
    radius: 150,
    chain: 'Vetri Theatres',
    city: 'Chennai',
    active: true,
  },

  // ── Devi Cinemas ──────────────────────────────────────────────────────────
  {
    id: 'chennai-devi-anna-salai',
    name: 'Devi Cinemas - Anna Salai',
    latitude: 13.0480,
    longitude: 80.2517,
    radius: 150,
    chain: 'Devi Cinemas',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-devi-paradise-tnagar',
    name: 'Devi Paradise - T. Nagar',
    latitude: 13.0410,
    longitude: 80.2317,
    radius: 150,
    chain: 'Devi Cinemas',
    city: 'Chennai',
    active: true,
  },

  // ── Kasi Theatre ──────────────────────────────────────────────────────────
  {
    id: 'chennai-kasi-ashok-nagar',
    name: 'Kasi Theatre - Ashok Nagar',
    latitude: 13.0370,
    longitude: 80.2120,
    radius: 150,
    chain: 'Kasi Theatre',
    city: 'Chennai',
    active: true,
  },

  // ── Other Popular Cinemas ─────────────────────────────────────────────────
  {
    id: 'chennai-udhayam-ashok-nagar',
    name: 'Udhayam Theatre - Ashok Nagar',
    latitude: 13.0380,
    longitude: 80.2140,
    radius: 150,
    chain: 'Udhayam',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-albert-egmore',
    name: 'Albert Theatre - Egmore',
    latitude: 13.0756,
    longitude: 80.2607,
    radius: 150,
    chain: 'Albert',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-abirami-purasawalkam',
    name: 'Abirami Mega Mall - Purasawalkam',
    latitude: 13.0830,
    longitude: 80.2560,
    radius: 150,
    chain: 'Abirami',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-gk-porur',
    name: 'GK Cinemas - Porur',
    latitude: 13.0380,
    longitude: 80.1580,
    radius: 150,
    chain: 'GK Cinemas',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-carnival-annanagar',
    name: 'Carnival Cinemas - Annanagar',
    latitude: 13.0860,
    longitude: 80.2070,
    radius: 150,
    chain: 'Carnival Cinemas',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-mayajaal-ecr',
    name: 'Mayajaal Multiplex - ECR (Kanathur)',
    latitude: 12.7950,
    longitude: 80.2470,
    radius: 150,
    chain: 'Mayajaal',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-woodlands-royapuram',
    name: 'Woodlands Theatre - Royapuram',
    latitude: 13.1130,
    longitude: 80.2910,
    radius: 150,
    chain: 'Woodlands',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-rakki-ambattur',
    name: 'Rakki Theatre - Ambattur',
    latitude: 13.1050,
    longitude: 80.1620,
    radius: 150,
    chain: 'Rakki',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-archana-vadapalani',
    name: 'Archana Theatre - Vadapalani',
    latitude: 13.0508,
    longitude: 80.2105,
    radius: 150,
    chain: 'Archana',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-jsk-arumbakkam',
    name: 'JSK Theatre - Arumbakkam',
    latitude: 13.0700,
    longitude: 80.2120,
    radius: 150,
    chain: 'JSK',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-ram-muthuram-tiruvanmiyur',
    name: 'RAM Muthuram Cinemas - Tiruvanmiyur',
    latitude: 12.9880,
    longitude: 80.2590,
    radius: 150,
    chain: 'RAM Muthuram',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-vettri-madipakkam',
    name: 'Vettri Theatres - Madipakkam',
    latitude: 12.9620,
    longitude: 80.1990,
    radius: 150,
    chain: 'Vettri Theatres',
    city: 'Chennai',
    active: true,
  },
  {
    id: 'chennai-sangam-kanchipuram-road',
    name: 'Sangam Theatres - Kanchipuram Road',
    latitude: 12.9100,
    longitude: 80.0800,
    radius: 150,
    chain: 'Sangam',
    city: 'Chennai',
    active: true,
  },
];

async function main() {
  console.log(`Seeding ${cinemas.length} Chennai cinemas...\n`);

  let created = 0;
  let updated = 0;

  for (const cinema of cinemas) {
    const result = await prisma.cinema.upsert({
      where: { id: cinema.id },
      update: {
        name: cinema.name,
        latitude: cinema.latitude,
        longitude: cinema.longitude,
        radius: cinema.radius,
        chain: cinema.chain,
        city: cinema.city,
        active: cinema.active,
      },
      create: {
        id: cinema.id,
        name: cinema.name,
        latitude: cinema.latitude,
        longitude: cinema.longitude,
        radius: cinema.radius,
        chain: cinema.chain,
        city: cinema.city,
        active: cinema.active,
      },
    });

    // Check if it was created or updated by comparing timestamps isn't
    // available, so we just log the upsert result.
    console.log(`  ~ ${cinema.name} (${cinema.latitude}, ${cinema.longitude})`);
  }

  const total = await prisma.cinema.count();
  console.log(`\nDone! Upserted ${cinemas.length} cinemas.`);
  console.log(`Total cinemas in DB: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
