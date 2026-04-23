/**
 * Chennai cinema database — authoritative 34-theater list with Google Maps
 * verified coordinates. Radius is a flat 100m per venue. IDs match the server
 * seed so geofence visit IDs resolve on sync.
 *
 * The single "My Test Cinema" entry at the top is retained for the
 * "Register Current Location as Cinema" / simulate-visit developer workflow
 * and is NOT a real venue.
 */
export interface CinemaSeed {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  address: string;
  chain: string | null;
  city: string;
  active: boolean;
}

export const CHENNAI_CINEMAS: CinemaSeed[] = [
  // ── Test Cinema (developer use only) ─────────────────────────────────────
  { id: 'my-home-test-cinema', name: 'My Test Cinema', latitude: 13.0218, longitude: 80.2602, radius: 100, address: 'Test Location', chain: null, city: 'Chennai', active: true },

  // ── Chennai real theaters (34) ───────────────────────────────────────────
  { id: 'pvr-sathyam-royapettah', name: 'PVR Sathyam Cinemas', latitude: 13.05526342, longitude: 80.2579751, radius: 100, address: 'Royapettah, Chennai', chain: 'PVR', city: 'Chennai', active: true },
  { id: 'pvr-escape-express-avenue', name: 'PVR Escape (Express Avenue)', latitude: 13.05899929, longitude: 80.26423947, radius: 100, address: 'Express Avenue, Royapettah, Chennai', chain: 'PVR', city: 'Chennai', active: true },
  { id: 'pvr-palazzo-nexus-vijaya', name: 'PVR Palazzo (Nexus Vijaya)', latitude: 13.05085297, longitude: 80.20936781, radius: 100, address: 'Nexus Vijaya Mall, Vadapalani, Chennai', chain: 'PVR', city: 'Chennai', active: true },
  { id: 'inox-luxe-phoenix-velachery', name: 'INOX Luxe (Phoenix)', latitude: 12.99157386, longitude: 80.2166751, radius: 100, address: 'Phoenix MarketCity, Velachery, Chennai', chain: 'INOX', city: 'Chennai', active: true },
  { id: 'ags-cinemas-tnagar', name: 'AGS Cinemas (T. Nagar)', latitude: 13.04747312, longitude: 80.24496732, radius: 100, address: 'T. Nagar, Chennai', chain: 'AGS', city: 'Chennai', active: true },
  { id: 'rohini-silver-screens-koyambedu', name: 'Rohini Silver Screens', latitude: 13.07566388, longitude: 80.19594367, radius: 100, address: 'Koyambedu, Chennai', chain: 'Rohini Silver Screens', city: 'Chennai', active: true },
  { id: 'vettri-theatres-chromepet', name: 'Vettri Theatres', latitude: 12.95456535, longitude: 80.14185288, radius: 100, address: 'Chromepet, Chennai', chain: null, city: 'Chennai', active: true },
  { id: 'gk-cinemas-porur', name: 'GK Cinemas', latitude: 13.03741758, longitude: 80.15543065, radius: 100, address: 'Porur, Chennai', chain: 'GK', city: 'Chennai', active: true },
  { id: 'pvr-vr-mall-anna-nagar', name: 'PVR VR Mall', latitude: 13.08050629, longitude: 80.1970386, radius: 100, address: 'VR Chennai, Anna Nagar, Chennai', chain: 'PVR', city: 'Chennai', active: true },
  { id: 'ega-cinemas-kilpauk', name: 'Ega Cinemas', latitude: 13.07761059, longitude: 80.24049959, radius: 100, address: 'Kilpauk, Chennai', chain: null, city: 'Chennai', active: true },
  { id: 'sangam-multiplex-kilpauk', name: 'Sangam Multiplex', latitude: 13.07895153, longitude: 80.24935364, radius: 100, address: 'Kilpauk, Chennai', chain: null, city: 'Chennai', active: true },
  { id: 'devi-cineplex-anna-salai', name: 'Devi Cineplex', latitude: 13.06639881, longitude: 80.27051178, radius: 100, address: 'Anna Salai, Chennai', chain: null, city: 'Chennai', active: true },
  { id: 'mayajaal-multiplex-kanathur', name: 'Mayajaal Multiplex', latitude: 12.84786339, longitude: 80.23986437, radius: 100, address: 'Kanathur, ECR, Chennai', chain: null, city: 'Chennai', active: true },
  { id: 'kamala-cinemas-vadapalani', name: 'Kamala Cinemas', latitude: 13.04937324, longitude: 80.21005908, radius: 100, address: 'Vadapalani, Chennai', chain: null, city: 'Chennai', active: true },
  { id: 'inox-chennai-citi-centre-mylapore', name: 'INOX Chennai Citi Centre', latitude: 13.04167643, longitude: 80.26899577, radius: 100, address: 'Chennai Citi Centre, Mylapore, Chennai', chain: 'INOX', city: 'Chennai', active: true },
  { id: 'pvr-aerohub-meenambakkam', name: 'PVR Aerohub', latitude: 12.98166508, longitude: 80.16524521, radius: 100, address: 'Meenambakkam, Chennai', chain: 'PVR', city: 'Chennai', active: true },
  { id: 'pvr-s2-theyagaraja-thiruvanmiyur', name: 'PVR S2 Theyagaraja', latitude: 12.98954359, longitude: 80.25616834, radius: 100, address: 'Thiruvanmiyur, Chennai', chain: 'PVR', city: 'Chennai', active: true },
  { id: 'ags-cinemas-villivakkam', name: 'AGS Cinemas (Villivakkam)', latitude: 13.10470773, longitude: 80.20889609, radius: 100, address: 'Villivakkam, Chennai', chain: 'AGS', city: 'Chennai', active: true },
  { id: 'ags-cinemas-vivira-mall-navalur', name: 'AGS Cinemas (Vivira Mall)', latitude: 12.85044707, longitude: 80.22622875, radius: 100, address: 'Vivira Mall, Navalur, OMR, Chennai', chain: 'AGS', city: 'Chennai', active: true },
  { id: 'cinepolis-bsr-mall-thoraipakkam', name: 'Cinepolis (BSR Mall)', latitude: 12.94958148, longitude: 80.2404839, radius: 100, address: 'BSR Mall, Thoraipakkam, Chennai', chain: 'Cinepolis', city: 'Chennai', active: true },
  { id: 'pvr-ampa-skywalk-aminjikarai', name: 'PVR Ampa Skywalk', latitude: 13.07394219, longitude: 80.22122467, radius: 100, address: 'Ampa Skywalk, Aminjikarai, Chennai', chain: 'PVR', city: 'Chennai', active: true },
  { id: 'pvr-grand-mall-velachery', name: 'PVR Grand Mall', latitude: 12.97190391, longitude: 80.22076393, radius: 100, address: 'Grand Mall, Velachery, Chennai', chain: 'PVR', city: 'Chennai', active: true },
  { id: 'pvr-heritage-rsl-uthandi', name: 'PVR Heritage RSL', latitude: 12.86347858, longitude: 80.24179598, radius: 100, address: 'Uthandi, ECR, Chennai', chain: 'PVR', city: 'Chennai', active: true },
  { id: 'rakki-cinemas-ambattur', name: 'Rakki Cinemas', latitude: 13.12263473, longitude: 80.14732896, radius: 100, address: 'Ambattur, Chennai', chain: null, city: 'Chennai', active: true },
  { id: 'woodlands-theatre-royapettah', name: 'Woodlands Theatre', latitude: 13.056611, longitude: 80.264889, radius: 100, address: 'Royapettah, Chennai', chain: null, city: 'Chennai', active: true },
  { id: 'kasi-talkies-ashok-nagar', name: 'Kasi Talkies', latitude: 13.03057605, longitude: 80.20716814, radius: 100, address: 'Ashok Nagar, Chennai', chain: null, city: 'Chennai', active: true },
  { id: 's2-cinemas-spectrum-mall-perambur', name: 'S2 Cinemas (Spectrum Mall)', latitude: 13.11224956, longitude: 80.23640563, radius: 100, address: 'Spectrum Mall, Perambur, Chennai', chain: 'S2', city: 'Chennai', active: true },
  { id: 'inox-national-virugambakkam', name: 'INOX National', latitude: 13.04680615, longitude: 80.19036715, radius: 100, address: 'Virugambakkam, Chennai', chain: 'INOX', city: 'Chennai', active: true },
  { id: 'gk-marlen-ayanavaram', name: 'GK Marlen (Gopi Krishna)', latitude: 13.09277062, longitude: 80.2271813, radius: 100, address: 'Ayanavaram, Chennai', chain: 'GK', city: 'Chennai', active: true },
  { id: 'vetrivel-cinemas-nanganallur', name: 'Vetrivel Cinemas', latitude: 12.97995167, longitude: 80.18249302, radius: 100, address: 'Nanganallur, Chennai', chain: null, city: 'Chennai', active: true },
  { id: 'albert-cinema-egmore', name: 'Albert Cinema', latitude: 13.07618661, longitude: 80.26394364, radius: 100, address: 'Egmore, Chennai', chain: null, city: 'Chennai', active: true },
  { id: 'kumaran-theatre-madipakkam', name: 'Kumaran Theatre', latitude: 12.97216029, longitude: 80.19164851, radius: 100, address: 'Madipakkam, Chennai', chain: null, city: 'Chennai', active: true },
  { id: 'raja-muthiah-theatre-ra-puram', name: 'Raja Muthiah Theatre', latitude: 13.02222147, longitude: 80.26169992, radius: 100, address: 'RA Puram, Chennai', chain: null, city: 'Chennai', active: true },
  { id: 'rani-theater-ra-puram', name: 'Rani Theater', latitude: 13.02223008, longitude: 80.26331796, radius: 100, address: 'RA Puram, Chennai', chain: null, city: 'Chennai', active: true },
];
