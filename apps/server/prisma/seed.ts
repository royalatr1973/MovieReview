import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const cinemas = [
  { name: 'AMC Empire 25', latitude: 40.7567, longitude: -73.9897, radius: 120, address: '234 W 42nd St, New York, NY' },
  { name: 'Regal Union Square', latitude: 40.7358, longitude: -73.9903, radius: 100, address: '850 Broadway, New York, NY' },
  { name: 'Alamo Drafthouse Brooklyn', latitude: 40.6864, longitude: -73.9815, radius: 100, address: '445 Albee Square W, Brooklyn, NY' },
  { name: 'AMC Lincoln Square 13', latitude: 40.7739, longitude: -73.9826, radius: 110, address: '1998 Broadway, New York, NY' },
  { name: 'IFC Center', latitude: 40.7340, longitude: -74.0003, radius: 80, address: '323 6th Ave, New York, NY' },
  { name: 'Angelika Film Center', latitude: 40.7256, longitude: -73.9955, radius: 90, address: '18 W Houston St, New York, NY' },
  { name: 'Nitehawk Cinema Williamsburg', latitude: 40.7119, longitude: -73.9636, radius: 80, address: '136 Metropolitan Ave, Brooklyn, NY' },
  { name: 'AMC Metreon 16', latitude: 37.7850, longitude: -122.4035, radius: 120, address: '135 4th St, San Francisco, CA' },
  { name: 'TCL Chinese Theatre', latitude: 34.1022, longitude: -118.3409, radius: 100, address: '6925 Hollywood Blvd, Los Angeles, CA' },
  { name: 'ArcLight Hollywood', latitude: 34.0983, longitude: -118.3288, radius: 110, address: '6360 Sunset Blvd, Los Angeles, CA' },
  { name: 'AMC Century City 15', latitude: 34.0574, longitude: -118.4177, radius: 120, address: '10250 Santa Monica Blvd, Los Angeles, CA' },
  { name: 'Regal LA Live', latitude: 34.0454, longitude: -118.2665, radius: 130, address: '1000 W Olympic Blvd, Los Angeles, CA' },
  { name: 'AMC River East 21', latitude: 41.8917, longitude: -87.6165, radius: 120, address: '322 E Illinois St, Chicago, IL' },
  { name: 'Music Box Theatre', latitude: 41.9496, longitude: -87.6645, radius: 80, address: '3733 N Southport Ave, Chicago, IL' },
  { name: 'Odeon Leicester Square', latitude: 51.5103, longitude: -0.1303, radius: 100, address: '24-26 Leicester Square, London' },
  { name: 'BFI IMAX', latitude: 51.5047, longitude: -0.1138, radius: 90, address: '1 Charlie Chaplin Walk, London' },
  { name: 'Curzon Soho', latitude: 51.5135, longitude: -0.1325, radius: 80, address: '99 Shaftesbury Ave, London' },
  { name: 'PVR Cinemas Juhu', latitude: 19.0987, longitude: 72.8263, radius: 100, address: 'Juhu, Mumbai, India' },
  { name: 'INOX Nariman Point', latitude: 19.0232, longitude: 72.8225, radius: 90, address: 'Nariman Point, Mumbai, India' },
  { name: 'Hoyts Melbourne Central', latitude: -37.8108, longitude: 144.9631, radius: 110, address: '211 La Trobe St, Melbourne, Australia' },
];

const movies = [
  { title: 'Dune: Part Three', year: 2026, language: 'English', format: 'IMAX' },
  { title: 'The Batman Part II', year: 2026, language: 'English', format: '2D' },
  { title: 'Avengers: Secret Wars', year: 2027, language: 'English', format: '3D' },
  { title: 'Mission: Impossible 8', year: 2025, language: 'English', format: 'IMAX' },
  { title: 'Spider-Man: Brand New Day', year: 2026, language: 'English', format: '3D' },
  { title: 'Oppenheimer 2', year: 2026, language: 'English', format: '2D' },
  { title: 'Parasite 2', year: 2026, language: 'Korean', format: '2D' },
  { title: 'The French Connection Remake', year: 2026, language: 'English', format: '2D' },
  { title: 'Interstellar 2', year: 2026, language: 'English', format: 'IMAX' },
  { title: 'Blade Runner 2099', year: 2026, language: 'English', format: '2D' },
];

async function main() {
  console.log('Seeding database...');

  for (const cinema of cinemas) {
    await prisma.cinema.upsert({
      where: { id: cinema.name.toLowerCase().replace(/\s+/g, '-') },
      update: cinema,
      create: { id: cinema.name.toLowerCase().replace(/\s+/g, '-'), ...cinema },
    });
  }
  console.log(`Seeded ${cinemas.length} cinemas`);

  for (const movie of movies) {
    await prisma.movie.upsert({
      where: { id: movie.title.toLowerCase().replace(/\s+/g, '-') },
      update: movie,
      create: { id: movie.title.toLowerCase().replace(/\s+/g, '-'), ...movie },
    });
  }
  console.log(`Seeded ${movies.length} movies`);

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
