/**
 * Seed the database with popular recent Tamil & Indian movies.
 * Run: npx tsx seed-movies.ts
 *
 * Movies are upserted (safe to run multiple times).
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedMovie {
  title: string;
  year: number;
  language: string;
}

// ── Recent & popular Tamil movies ──────────────────────────────────────────
const tamilMovies: SeedMovie[] = [
  // 2026
  { title: 'Thaikilavi', year: 2026, language: 'Tamil' },
  { title: 'Vidaamuyarchi', year: 2026, language: 'Tamil' },
  { title: 'Coolie', year: 2026, language: 'Tamil' },
  { title: 'Madha Gaja Raja', year: 2026, language: 'Tamil' },
  { title: 'Bomb Squad', year: 2026, language: 'Tamil' },
  { title: 'Dominic and the Ladies Purse', year: 2026, language: 'Tamil' },
  { title: 'Thunivu 2', year: 2026, language: 'Tamil' },
  { title: 'Parasakthi', year: 2026, language: 'Tamil' },

  // 2025
  { title: 'Viduthalai Part 2', year: 2025, language: 'Tamil' },
  { title: 'Kanguva', year: 2025, language: 'Tamil' },
  { title: 'Amaran', year: 2025, language: 'Tamil' },
  { title: 'Vettaiyan', year: 2025, language: 'Tamil' },
  { title: 'GOAT', year: 2025, language: 'Tamil' },
  { title: 'Indian 2', year: 2025, language: 'Tamil' },
  { title: 'Raayan', year: 2025, language: 'Tamil' },
  { title: 'Maharaja', year: 2025, language: 'Tamil' },
  { title: 'Aranmanai 4', year: 2025, language: 'Tamil' },
  { title: 'Lubber Pandhu', year: 2025, language: 'Tamil' },
  { title: 'Meiyazhagan', year: 2025, language: 'Tamil' },
  { title: 'Brother', year: 2025, language: 'Tamil' },
  { title: 'Demonte Colony 2', year: 2025, language: 'Tamil' },
  { title: 'Garudan', year: 2025, language: 'Tamil' },
  { title: 'Star', year: 2025, language: 'Tamil' },
  { title: 'Vaazhai', year: 2025, language: 'Tamil' },
  { title: 'Ayngaran', year: 2025, language: 'Tamil' },
  { title: 'Thangalaan', year: 2025, language: 'Tamil' },
  { title: 'Sorgavaasal', year: 2025, language: 'Tamil' },

  // 2024
  { title: 'Leo', year: 2024, language: 'Tamil' },
  { title: 'Jailer', year: 2024, language: 'Tamil' },
  { title: 'Ponniyin Selvan 2', year: 2024, language: 'Tamil' },
  { title: 'Captain Miller', year: 2024, language: 'Tamil' },
  { title: 'Lal Salaam', year: 2024, language: 'Tamil' },
  { title: 'Ayalaan', year: 2024, language: 'Tamil' },
  { title: 'Nelson Dilipkumar Jailer', year: 2024, language: 'Tamil' },
  { title: 'Mark Antony', year: 2024, language: 'Tamil' },
  { title: 'Japan', year: 2024, language: 'Tamil' },
  { title: 'Por Thozhil', year: 2024, language: 'Tamil' },
  { title: 'Maamannan', year: 2024, language: 'Tamil' },
  { title: 'Pathu Thala', year: 2024, language: 'Tamil' },
];

// ── Recent Hindi / Bollywood movies ────────────────────────────────────────
const hindiMovies: SeedMovie[] = [
  { title: 'Pushpa 2: The Rule', year: 2025, language: 'Hindi' },
  { title: 'Stree 2', year: 2025, language: 'Hindi' },
  { title: 'Singham Again', year: 2025, language: 'Hindi' },
  { title: 'Bhool Bhulaiyaa 3', year: 2025, language: 'Hindi' },
  { title: 'Fighter', year: 2025, language: 'Hindi' },
  { title: 'Crew', year: 2025, language: 'Hindi' },
  { title: 'Shaitaan', year: 2025, language: 'Hindi' },
  { title: 'Teri Baaton Mein Aisa Uljha Jiya', year: 2025, language: 'Hindi' },
  { title: 'Jawan', year: 2024, language: 'Hindi' },
  { title: 'Pathaan', year: 2024, language: 'Hindi' },
  { title: 'Gadar 2', year: 2024, language: 'Hindi' },
  { title: 'Rocky Aur Rani Kii Prem Kahaani', year: 2024, language: 'Hindi' },
  { title: 'Animal', year: 2024, language: 'Hindi' },
  { title: '12th Fail', year: 2024, language: 'Hindi' },
  { title: 'Dunki', year: 2024, language: 'Hindi' },
  { title: 'Sam Bahadur', year: 2024, language: 'Hindi' },
];

// ── Telugu movies ──────────────────────────────────────────────────────────
const teluguMovies: SeedMovie[] = [
  { title: 'Pushpa 2', year: 2025, language: 'Telugu' },
  { title: 'Devara: Part 1', year: 2025, language: 'Telugu' },
  { title: 'Kalki 2898 AD', year: 2025, language: 'Telugu' },
  { title: 'Guntur Kaaram', year: 2025, language: 'Telugu' },
  { title: 'Tillu Square', year: 2025, language: 'Telugu' },
  { title: 'Hi Nanna', year: 2024, language: 'Telugu' },
  { title: 'Salaar: Part 1', year: 2024, language: 'Telugu' },
  { title: 'RRR', year: 2024, language: 'Telugu' },
];

// ── Malayalam movies ───────────────────────────────────────────────────────
const malayalamMovies: SeedMovie[] = [
  { title: 'Manjummel Boys', year: 2025, language: 'Malayalam' },
  { title: 'Aavesham', year: 2025, language: 'Malayalam' },
  { title: 'Aadujeevitham', year: 2025, language: 'Malayalam' },
  { title: 'Bramayugam', year: 2025, language: 'Malayalam' },
  { title: 'Premalu', year: 2025, language: 'Malayalam' },
  { title: 'Turbo', year: 2025, language: 'Malayalam' },
  { title: 'Guruvayoor Ambalanadayil', year: 2025, language: 'Malayalam' },
  { title: 'Marco', year: 2025, language: 'Malayalam' },
];

// ── Hollywood (commonly screened in Indian cinemas) ────────────────────────
const englishMovies: SeedMovie[] = [
  { title: 'Deadpool & Wolverine', year: 2025, language: 'English' },
  { title: 'Inside Out 2', year: 2025, language: 'English' },
  { title: 'Dune: Part Two', year: 2025, language: 'English' },
  { title: 'Gladiator II', year: 2025, language: 'English' },
  { title: 'Wicked', year: 2025, language: 'English' },
  { title: 'Moana 2', year: 2025, language: 'English' },
  { title: 'Alien: Romulus', year: 2025, language: 'English' },
  { title: 'Joker: Folie a Deux', year: 2025, language: 'English' },
  { title: 'Oppenheimer', year: 2024, language: 'English' },
  { title: 'Barbie', year: 2024, language: 'English' },
  { title: 'The Batman', year: 2024, language: 'English' },
];

const allMovies = [
  ...tamilMovies,
  ...hindiMovies,
  ...teluguMovies,
  ...malayalamMovies,
  ...englishMovies,
];

async function main() {
  console.log(`Seeding ${allMovies.length} movies...\n`);

  let created = 0;
  let skipped = 0;

  for (const movie of allMovies) {
    // Generate a stable ID from the title
    const id = `seed-${movie.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    // Check if movie already exists (by title, case-insensitive)
    const existing = await prisma.movie.findFirst({
      where: { title: { equals: movie.title, mode: 'insensitive' } },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.movie.create({
      data: {
        id,
        title: movie.title,
        year: movie.year,
        language: movie.language,
        userSubmitted: false,
      },
    });
    created++;
    console.log(`  + ${movie.title} (${movie.year}, ${movie.language})`);
  }

  console.log(`\nDone! Created: ${created}, Skipped (already exist): ${skipped}`);
  console.log(`Total movies in DB: ${await prisma.movie.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
