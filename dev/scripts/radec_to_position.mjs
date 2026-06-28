// radec_to_position.mjs
// ---------------------------------------------------------------------------
// Converts equatorial coordinates (RA, Dec — Ep J2000, Eq J2000) + distance
// into Stellaris static-galaxy (x, y) positions for the Stellar Neighborhood
// map, and emits ready-to-paste `system = { ... }` blocks.
//
// Pipeline per star:
//   1. RA/Dec (J2000)        -> galactic longitude l, latitude b
//   2. l + distance (ly)     -> x = dist*sin(l)*SCALE,  y = dist*cos(l)*SCALE
//      (same convention as compute_positions.mjs: galactic-plane projection,
//       latitude b is computed for reference but NOT used for placement.)
//   3. spectral class + #stars -> initializer (with fallbacks for the F/A/B
//      types that have no _trinary variant, and TODO flags for giants,
//      white-dwarf/brown-dwarf primaries, peculiar A/B stars, etc.)
//
// Usage:
//   node radec_to_position.mjs            # dry run: print blocks + warnings
//   node radec_to_position.mjs --selftest # verify the coordinate transform
//   node radec_to_position.mjs --write    # inject blocks into the scenario file
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SCALE = 8;
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

// --- J2000 galactic frame constants (IAU) ---
const RA_NGP = 192.85948 * D2R; // RA of North Galactic Pole
const DEC_NGP = 27.12825 * D2R; // Dec of North Galactic Pole
const L_NCP = 122.93192 * D2R;  // galactic longitude of North Celestial Pole

function parseRA(str) {
  // "22 57 27.9805" (h m s)
  const [h, m, s] = str.trim().split(/\s+/).map(Number);
  return (h + m / 60 + s / 3600) * 15; // degrees
}
function parseDec(str) {
  const t = str.trim();
  const neg = t.startsWith('-') || t.startsWith('−');
  const nums = t.match(/[\d.]+/g).map(Number);
  const [d, m = 0, s = 0] = nums;
  return (neg ? -1 : 1) * (d + m / 60 + s / 3600); // degrees
}

// RA/Dec (deg) -> galactic l, b (deg, l in [0,360))
function equatorialToGalactic(raDeg, decDeg) {
  const ra = raDeg * D2R, dec = decDeg * D2R;
  const sinb = Math.sin(DEC_NGP) * Math.sin(dec)
    + Math.cos(DEC_NGP) * Math.cos(dec) * Math.cos(ra - RA_NGP);
  const b = Math.asin(Math.max(-1, Math.min(1, sinb)));
  const yTerm = Math.cos(dec) * Math.sin(ra - RA_NGP);
  const xTerm = Math.cos(DEC_NGP) * Math.sin(dec)
    - Math.sin(DEC_NGP) * Math.cos(dec) * Math.cos(ra - RA_NGP);
  let l = L_NCP - Math.atan2(yTerm, xTerm);
  l = ((l % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return { l: l * R2D, b: b * R2D };
}

function position(distLy, lDeg) {
  const l = lDeg * D2R;
  return {
    x: Math.round(distLy * Math.sin(l) * SCALE),
    y: Math.round(distLy * Math.cos(l) * SCALE),
  };
}

// --- initializer selection -------------------------------------------------
const AVAIL = {
  red: ['unary', 'binary', 'trinary'],
  orange: ['unary', 'binary', 'trinary'],
  yellow: ['unary', 'binary', 'trinary'],
  yellow_white: ['unary', 'binary'],
  white: ['unary', 'binary'],
  blue_white: ['unary', 'binary'],
};
const WORD = { 1: 'unary', 2: 'binary', 3: 'trinary' };

function colorFromCls(cls) {
  const c = cls.trim().toUpperCase().replace(/^K?A?/, m => m); // keep as-is
  const first = cls.trim().toUpperCase()[0];
  switch (first) {
    case 'O': case 'B': return 'blue_white';
    case 'A': return 'white';
    case 'F': return 'yellow_white';
    case 'G': return 'yellow';
    case 'K': return 'orange';
    case 'M': return 'red';
    case 'D': return 'WD'; // degenerate white dwarf
    case 'L': case 'T': case 'Y': return 'BD'; // brown dwarf
    default: return 'yellow';
  }
}

function pickInit(cls, n, explicitTodo) {
  const todos = [];
  let color = colorFromCls(cls);

  // Degenerate / sub-stellar primaries: no dedicated init — approximate.
  if (color === 'WD') { todos.push(`white-dwarf primary (${cls}) — needs custom init`); color = 'red'; }
  if (color === 'BD') { todos.push(`brown-dwarf primary (${cls}) — needs custom init`); color = 'red'; }

  let want = WORD[n] || 'trinary';
  if (n >= 4) todos.push(`${n}-star system capped to trinary init`);

  // Fall back when the chosen color has no _trinary variant.
  if (!AVAIL[color].includes(want)) {
    const fallback = 'binary';
    todos.push(`${want} unavailable for ${color} type — using ${fallback}`);
    want = fallback;
  }

  // Auto flags for things worth a manual second pass.
  if (/I{2,3}/.test(cls)) todos.push(`giant/bright-giant (${cls}) — no giant init, using nearest dwarf type`);
  if ((color === 'white' || color === 'blue_white') && /p/.test(cls)) todos.push(`chemically peculiar (${cls})`);
  if (explicitTodo) todos.push(explicitTodo);

  return { init: `astra_invicta_${color}_dwarf_${want}_init`, color, word: want, todos };
}

// --- new star data ---------------------------------------------------------
// s(name, RA "h m s", Dec "±d m s", dist_ly, cls, nStars, note, todo)
const s = (name, ra, dec, dist, cls, n = 1, note = '', todo = '') =>
  ({ name, ra, dec, dist, cls, n, note, todo });

const STARS = [
  s('Delta Aquilae', '19 25 29.90139', '+03 06 53.2061', 50.1, 'F0IV', 2, 'spectroscopic binary'),
  s('Sigma Bootis', '14 34 40.817', '+29 44 42.48', 50.4, 'F2V', 1),
  // REMOVED: Gliese 227 is not a real catalogued star (source row was bogus).
  s('Gliese 862', '22 29 15.20', '-30 01 06.40', 50.4, 'K5V', 1),
  s('Phi2 Ceti', '00 50 07.58896', '-10 38 39.5839', 50.4, 'F7V', 1),
  s('Gliese 758', '19 23 34.01317', '+33 13 19.0784', 50.5, 'G8V', 1, 'hosts a directly-imaged sub-stellar companion (Gliese 758 B)'),
  s('99 Herculis', '18 07 01.53971', '+30 33 43.6896', 50.5, 'F7V', 2, 'F7V + K4V; circumbinary debris disk'),
  s('HD 38858', '05 48 34.94026', '-04 05 40.7218', 50.8, 'G4V', 1, 'solar analog'),
  s('104 Tauri', '05 07 27.00529', '+18 38 42.1815', 51.8, 'G4V', 1),
  s('Gliese 3929', '15 58 18.80', '+35 24 24.3', 51.54, 'M3.5V', 1, '2 planets + 1 candidate', 'multi-planet M dwarf — consider custom init'),
  s('I Carinae', '10 24 23.70597', '-74 01 53.8036', 52.9, 'F2IV', 1),
  s('Xi Pegasi', '22 46 41.58118', '+12 10 22.3854', 53.0, 'F6V', 2, 'F6V + M3.5'),
  s('Gliese 143', '03 26 59.22', '-63 29 56.9', 53.4, 'K', 1),
  s('Alpha Circini', '14 42 30.41958', '-64 58 30.4934', 53.5, 'A7Vp', 2, 'rapidly oscillating Ap (roAp) star; binary with K5V', 'roAp variable — custom init recommended'),
  s('BY Draconis', '18 33 55.7728', '+51 43 08.905', 53.6, 'K6Ve', 2, 'prototype BY Draconis spotted variable; K6V + K7V', 'flare/variable prototype — consider custom init'),
  s('Gliese 676', '17 30 11.20', '-51 38 13.1', 53.7, 'M0V', 2, 'M0V + M3V; 4 planets', 'four-planet system — consider custom init'),
  s('HD 128311', '14 36 00.56073', '+09 44 47.4536', 54.0, 'K0V', 1, '2 planets + 1 candidate'),
  s('39 Tauri', '04 05 20.258', '+22 00 32.06', 54.6, 'G5V', 1),
  s('Wolf 1130', '20 05 02.1951', '+54 26 03.234', 54.09, 'M3', 2, 'sdM3 subdwarf + white-dwarf companion; closest Type Ia supernova progenitor candidate', 'WD companion + SN Ia candidate — custom init'),
  s('HD 7924', '01 21 59.11373', '+76 42 37.0383', 54.9, 'K0V', 1, '3 planets', '3-planet system — consider custom init'),
  s('Iota Horologii', '02 42 33.46667', '-50 48 01.0551', 56.2, 'G0V', 1, '1 planet'),
  s('q1 Eridani', '01 42 29.3145', '-53 44 26.991', 56.6, 'F9V', 1, '1 planet + debris disk'),
  s('Rho Coronae Borealis', '16 01 02.66049', '+33 18 12.6395', 56.8, 'G0V', 1, '4 planets', '4-planet system — consider custom init'),
  s('Chi Eridani', '01 55 57.45606', '-51 36 31.9736', 57.0, 'G8IV', 1),
  s('Xi Geminorum', '06 45 17.36432', '+12 53 44.1311', 57.2, 'F5IV', 1, 'Alzirr'),
  s('59 Virginis', '13 16 46.51486', '+09 25 26.9601', 57.3, 'G0V', 1, '1 planet'),
  s('83 Leonis', '11 26 45.32173', '+03 00 47.1566', 57.6, 'K0IV', 2, 'K0IV + K2V; 2 planets (around B)'),
  s('Eta Coronae Borealis', '15 23 12.305', '+30 17 16.17', 58.3, 'G1V', 3, 'G1V + G3V + L8 brown dwarf', 'L8 brown-dwarf tertiary'),
  s('Alpha Comae Berenices', '13 09 59.285', '+17 31 46.04', 58.3, 'F5V', 2, 'Diadem; near-twin F5V + F5V'),
  s('Gamma Coronae Australis', '19 06 25.11014', '-37 03 48.3901', 58.4, 'F8V', 2, 'F8V + F8V'),
  s('Tau6 Eridani', '03 46 50.88819', '-23 14 59.0046', 58.5, 'F5V', 1),
  s('Delta Geminorum', '07 20 07.37978', '+21 58 56.3377', 58.8, 'F0IV', 2, 'Wasat; F0IV + K'),
  s('Rho Geminorum', '07 29 06.719', '+31 47 04.38', 58.9, 'F1V', 3, 'F1V + M5 + K2.5V'),
  s('14 Herculis', '16 10 24.31568', '+43 49 03.5074', 59.2, 'K0V', 1, '2 planets'),
  s('Epsilon Reticuli', '04 16 29.028', '-59 18 07.76', 59.5, 'K2IV', 2, 'K2IV + DA white dwarf; 1 planet', 'white-dwarf companion'),
  s('Beta Arietis', '01 54 38.41099', '+20 48 28.9133', 59.6, 'A5V', 2, 'Sheratan; A5V + G2V'),
  s('Psi Velorum', '09 30 41.99958', '-40 28 00.2616', 59.7, 'F3IV', 2, 'F3IV + F0V'),
  s('Delta Equulei', '21 14 28.81531', '+10 00 25.1259', 60.0, 'F5V', 2, 'F5V + G0'),
  s('HD 53143', '06 59 59.65505', '-61 20 10.2526', 60.0, 'K9V', 1, 'prominent debris disk'),
  s('HN Pegasi', '21 44 31.330', '+14 46 18.98', 60.0, 'G0V', 1, 'young solar analog (HR 8314); directly-imaged brown-dwarf companion'),
  s('HR 244', '00 53 04.19644', '+61 07 26.2993', 60.6, 'F9V', 1),
  s('Theta Cygni', '19 36 26.53436', '+50 13 15.9646', 60.7, 'F3V', 2, 'F3V + M3V'),
  s('Theta Centauri', '14 06 40.94752', '-36 22 11.8371', 60.9, 'K0III', 1, 'Menkent (orange giant)'),
  s('Mu Virginis', '14 43 03.62282', '-05 39 29.5327', 60.9, 'F2IV', 1),
  s('Kelu-1', '13 05 40.196', '-25 41 05.99', 60.9, 'L2', 2, 'L2 + L4 brown-dwarf binary (no stellar component)'),
  s('Tau Piscis Austrini', '22 10 08.78019', '-32 32 54.2703', 61.1, 'F6V', 1),
  s('HD 4747', '00 49 26.76537', '-23 12 44.9359', 61.4, 'G8V', 2, 'G8V + L9 brown-dwarf companion', 'brown-dwarf companion'),
  s('6 Ceti', '00 11 15.85804', '-15 28 04.7205', 61.6, 'F8V', 1),
  s('Eta Serpentis', '18 21 18.60056', '-02 53 55.7766', 61.8, 'K0IV', 1, 'Tang'),
  s('110 Herculis', '18 45 39.72570', '+20 32 46.7171', 62.3, 'F6V', 1),
  s('Rho Puppis', '08 07 32.64882', '-24 18 15.5679', 62.7, 'F5IIp', 1, 'Tureis; Delta Scuti variable, peculiar bright giant', 'peculiar pulsating bright giant — custom init'),
  s('1 Centauri', '13 45 41.24482', '-33 02 37.3997', 62.8, 'F3IV', 1),
  s('HD 189733', '20 00 43.71294', '+22 42 39.0732', 63.0, 'K1.5V', 2, 'K1.5V + M; hosts famous transiting hot Jupiter HD 189733 b', 'famous hot-Jupiter host — consider custom init'),
  s('Beta Pictoris', '05 47 17.09', '-51 03 59.4', 62.9, 'A6V', 1, 'iconic debris disk; directly-imaged planets b & c', 'iconic young debris-disk system — custom init'),
  s('HD 43587', '06 17 16.139', '+05 06 00.40', 63.0, 'G0V', 4, 'G0V + M0V + M3.5V + M5V'),
  s('Omicron Aquilae', '19 51 01.644', '+10 24 56.59', 63.3, 'F8V', 2, 'F8V + M3V'),
  s('Alpha Chamaeleontis', '08 18 31.552', '-76 55 11.01', 63.5, 'F5V', 1),
  s('c Ursae Majoris', '09 14 20.542', '+61 25 23.94', 63.8, 'G0V', 2, 'G0V + K'),
  s('74 Orionis', '06 16 26.61911', '+12 16 19.7876', 64.0, 'F', 1),
  s('Alpha Trianguli', '01 53 04.90710', '+29 34 43.7801', 64.1, 'F5III-F6IV', 3, 'Mothallah; F + M + M'),
  s('Eta Crucis', '12 06 52.89814', '-64 36 49.4305', 64.2, 'F2III', 1),
  s('45 Bootis', '15 07 18.06587', '+24 52 09.0952', 64.3, 'F5V', 1),
  s('HD 217107', '22 58 15.5408', '-02 23 43.383', 64.3, 'G8IV', 1, '2 planets'),
  s('Nu2 Canis Majoris', '06 36 41.038', '-19 15 21.17', 64.7, 'K1III', 1, 'orange giant; hosts a planet'),
  s('HD 192263', '20 13 59.8456', '-00 52 00.770', 64.9, 'K2V', 1, 'Phoenicia (IAU named); 1 planet'),
  s('22 Lyncis', '07 29 55.86', '+49 40 21.6', 64.9, 'F6V', 1),
  s('LHS 1678', '04 32 42.635', '-39 47 12.15', 64.79, 'M2V', 1, 'TOI-696; 3 planets', '3-planet system — consider custom init'),
  s('Aldebaran', '04 35 55.23907', '+16 30 33.4885', 65.1, 'K5III', 1, 'brightest star in Taurus; orange giant; candidate planet', 'iconic giant — custom init'),
  s('Gliese 328', '08 55 07.62173', '+01 32 47.4151', 65.3, 'M0V', 1, '2 planets'),
  s('Epsilon Scorpii', '16 50 09.8', '-34 17 36', 65.4, 'K1III', 1, 'Larawag (orange giant)'),
  s('Alpha Caeli', '04 40 33.71251', '-41 51 49.5045', 65.7, 'F2V', 2, 'F2V + M0.5'),
  s('81 Cancri', '09 12 17.547', '+14 59 45.78', 65.7, 'G8V', 4, 'G8V + K1V + L8 + L8 brown dwarfs', 'two brown-dwarf components'),
  s('Hamal', '02 07 10.40570', '+23 27 44.7032', 65.9, 'K1IIIb', 1, 'Alpha Arietis; orange giant; 1 planet'),
  s('RR Caeli', '04 21 05.563', '-48 39 07.06', 65.65, 'DA7.8', 2, 'eclipsing white-dwarf + M6V binary; 1 circumbinary planet'),
  s('GJ 3293', '04 28 35.71911', '-25 10 09.2979', 65.91, 'M2.5', 1, '4 planets', '4-planet system — consider custom init'),
  s('Gliese 221', '05 53 00.285', '-05 59 41.44', 66.3, 'K7V', 2, 'K7V + M0V; 3 planets', '3-planet system — consider custom init'),
  s('Tau Cygni', '21 14 47.4916', '+38 02 43.141', 66.4, 'F2IV', 2, 'F2IV + G0V'),
  s('Kappa Tucanae', '01 15 46.0891', '-68 52 33.401', 66.04, 'F6IV', 1),
  s('9 Ceti', '00 22 51.788', '-12 12 33.97', 66.5, 'G3V', 1, 'young Sun-like (BY Dra variable)'),
  s('HD 114783', '13 12 43.78556', '-02 15 54.1307', 66.6, 'K0V', 1, 'hosts planet(s)'),
  s('Sigma2 Ursae Majoris', '09 10 23.538', '+67 08 02.44', 66.7, 'F7IV', 2, 'F7IV + K2V'),
  s('HD 114613', '13 12 03.18430', '-37 48 10.8799', 66.8, 'G3IV', 1, '2 planets'),
  s('HD 24496', '03 54 28.03326', '+16 36 57.7897', 67.4, 'G7V', 2, 'G7V + M2V; 1 planet'),
  s('94 Aquarii', '23 19 06.7257', '-13 27 31.615', 67.6, 'G8.5IV', 2, 'G8.5IV + K2V'),
  s('HD 104067', '11 59 10.00884', '-20 21 13.6121', 67.9, 'K3V', 1, '2 planets + 1 candidate'),
  s('Gliese 900', '23 35 00.27674', '+01 36 19.4347', 68.0, 'K6', 3, 'K5-7 + M3-4 + M5-6; 1 planet'),
  s('17 Cygni', '19 46 25.600', '+33 43 39.35', 68.0, 'F7V', 2, 'F7V + M0.4'),
  s('HR 5', '00 06 15.81387', '+58 26 12.1073', 68.2, 'G', 1),
  s('Theta Draconis', '16 01 53.34636', '+58 33 54.9056', 68.3, 'F9V', 1),
  s('13 Ceti', '00 35 14.87968', '-03 35 34.2367', 68.3, 'F6V', 3, 'F6V + K3.5V + G4V'),
  s('HD 33564', '05 22 33.5306', '+79 13 52.143', 68.4, 'F6V', 1, '1 planet'),
  s('71 Orionis', '06 14 50.94', '+19 09 24.8', 68.9, 'F', 1),
  s('40 Leonis', '10 19 44.16688', '+19 28 15.2943', 69.0, 'F6IV', 1),
  s('51 Arietis', '03 02 26.02628', '+26 36 33.2602', 69.0, 'G8V', 1),
  s('I Puppis', '07 12 33.62514', '-46 45 33.4966', 69.1, 'F', 1),
  s('HD 210277', '22 09 29.8658', '-07 32 55.162', 69.4, 'G0IV', 1, '1 planet'),
  s('50 Persei', '04 08 36.61660', '+38 02 23.0488', 69.6, 'F7V', 1),
  s('B Carinae', '08 09 00.56958', '-61 18 08.5836', 69.8, 'F6V', 1, 'HR 3220'),
  s('16 Cygni', '19 41 48.9535', '+50 31 30.220', 69.8, 'G1.5V', 3, 'G1.5V + G2.5V wide pair (+ M); hosts 16 Cygni Bb', 'famous wide-binary planet host — consider custom init'),
  s('HD 92945', '10 43 28.2716', '-29 03 51.433', 69.8, 'K1V', 1, 'debris disk'),
  s('Iota Virginis', '14 16 00.868', '-06 00 01.97', 69.8, 'F7IV', 1, 'Syrma'),
  s('Kappa Reticuli', '03 29 22.67742', '-62 56 15.1042', 69.9, 'F5V', 2, 'F5V + K'),
  s('HD 90089', '10 31 04.7079', '+82 33 31.146', 70.1, 'F2V', 1, 'cold debris disk (~30 K)'),
  s('Epsilon Serpentis', '15 50 48.96622', '+04 28 39.8311', 70.4, 'A2Vm', 1, 'metallic-line (Am) star'),
  s('Zeta Leporis', '05 46 57.34096', '-14 49 19.0199', 70.5, 'A2IV', 1, 'prominent warm debris disk / asteroid belt'),
  s('84 Ceti', '02 41 13.99720', '-00 41 44.3845', 70.5, 'F7V', 2, 'F7V + K2V'),
  s('Sigma Coronae Borealis', '16 14 40.854', '+33 51 31.02', 70.7, 'F9V', 3, 'F9V + G0V close pair with M-dwarf companions (5+ components)', 'high-multiplicity system'),
  s('HD 215152', '22 43 21.3028', '-06 24 02.953', 70.39, 'K3V', 1, '4 planets', '4-planet system — consider custom init'),
  s('HD 159062', '17 30 16.42797', '+47 24 07.9010', 70.619, 'G9V', 2, 'G9V + white-dwarf companion', 'white-dwarf companion'),
  s('Theta Sculptoris', '00 11 44.02079', '-35 07 59.2320', 71.1, 'F5V', 1),
  s('Alpha Hydri', '01 58 46.19467', '-61 34 11.4948', 71.3, 'F0IV', 1),
  s('Lambda Arae', '17 40 23.826', '-49 24 56.10', 71.3, 'F4V', 1),
  s('HD 91324', '10 31 21.82130', '-53 42 55.7373', 71.3, 'F9V', 2, 'F9V + M5'),
  s('Eta Scorpii', '17 12 09.19565', '-43 14 21.0905', 71.6, 'F5IV', 1),
  s('Gamma Tucanae', '23 17 25.77222', '-58 14 08.6287', 71.8, 'F1III', 1),
  s('Psi1 Draconis', '17 41 56.35536', '+72 08 55.8481', 71.9, 'F5V', 2, 'Dziban; F5V + F8V; 1 planet'),
  s('HD 164922', '18 02 30.86234', '+26 18 46.8050', 71.69, 'G9V', 1, '4 planets', '4-planet system — consider custom init'),
  s('Epsilon Cygni', '20 46 12.68236', '+33 58 12.9250', 72.7, 'K0III', 1, 'Aljanah (orange giant)'),
  s('94 Ceti', '03 12 46.43719', '-01 11 45.9613', 73.0, 'F8V', 3, 'F8V + M3V + M; 1 planet'),
  s('Mu Cygni', '21 44 08.57767', '+28 44 33.4567', 73.1, 'F6V', 2, 'F6V + G2V'),
  s('18 Puppis', '08 10 39.98', '-13 47 57.7', 73.3, 'F', 1),
  s('Nu Octantis', '21 41 28.64977', '-77 23 24.1563', 73.5, 'K1III', 2, 'K1III + white dwarf; controversial circumbinary planet', 'white-dwarf companion'),
  s('Alpha Serpentis', '15 44 16.07431', '+06 25 32.2633', 74.0, 'K2IIIb', 1, 'Unukalhai (orange giant)'),
  // REMOVED: EZ Ceti is a duplicate designation of Chi Ceti (kept below).
  s('Zeta Virginis', '13 34 41.591', '-00 35 44.95', 74.1, 'A3V', 2, 'Heze; A3V + M4-7V'),
  s('39 Leonis', '10 17 14.538', '+23 06 22.38', 74.1, 'F6V', 2, 'F6V + M1'),
  s('Upsilon Aquarii', '22 34 41.636', '-20 42 29.58', 74.2, 'F5V', 1),
  s('Alpha Coronae Borealis', '15 34 41.268', '+26 42 52.89', 75.0, 'A0V', 2, 'Alphecca; Algol-type eclipsing binary A0V + G5V'),
  s('Delta Herculis', '17 15 01.9106', '+24 50 21.135', 75.1, 'A3IV', 1, 'Sarin'),
  s('Omega Draconis', '17 36 57.09431', '+68 45 28.6815', 75.6, 'F5V', 1),
  s('Chi Ceti', '01 49 35.10277', '-10 41 11.0719', 75.6, 'F3III', 1),
  s('Alpha2 Librae', '14 50 41.18097', '-15 59 50.0482', 75.8, 'A5IV-V', 1, 'Zubenelgenubi; brightest member of the multiple Alpha Librae system (incl. KU Librae)'),
  s('HD 212168', '22 25 51.15504', '-75 00 56.4763', 75.17, 'G3IV', 1),
  s('Omega Sagittarii', '19 55 50.36255', '-26 17 57.6933', 76.4, 'G5IV', 1, 'Terebellum'),
  s('HD 1461', '00 18 41.8677', '-08 03 10.804', 76.5, 'G3V', 1, '2 planets + 2 candidates'),
  s('64 Piscium', '00 48 58.70805', '+16 56 26.3132', 76.5, 'F8V', 2, 'F8V + F8V'),
  s('Zeta Serpentis', '18 00 29.0', '-03 41 25', 76.8, 'F2V', 1),
  s('Mu2 Cancri', '08 07 45.856', '+21 34 54.53', 77.0, 'G2IV', 1),
  s('Kappa Phoenicis', '00 26 12.20183', '-43 40 47.3929', 77.7, 'A5IVn', 1),
  s('23 Ursae Majoris', '09 31 31.70873', '+63 03 42.7013', 77.7, 'F0IV', 1),
  // REMOVED: KU Librae is the 5th component of the Alpha Librae system -> folded into Alpha2 Librae.
  s('HD 202628', '21 18 27.26962', '-43 20 04.7431', 77.73, 'G1.5V', 1, 'candidate planet + debris disk'),
  s('27 Cygni', '20 06 21.76743', '+35 58 20.8875', 78.1, 'G8.5IVa', 1),
  s('Lambda Sagittarii', '18 27 58.24072', '-25 25 18.1146', 78.2, 'K0IV', 1, 'Kaus Borealis'),
  s('HD 134060', '15 10 44.74301', '-61 25 20.3607', 78.4, 'G3IV', 1, '2 planets'),
  s('HD 3765', '00 40 49.270', '+40 11 13.82', 78.5, 'K2V', 1, '1 planet'),
  s('12 Persei', '02 42 14.91569', '+40 11 38.1898', 78.9, 'F9V', 2, 'F9V + F'),
  s('Iota Leonis', '11 23 55.45273', '+10 31 46.2195', 79.0, 'F3IV', 2, 'F3IV + G'),
  s('Regulus', '10 08 22.311', '+11 58 01.95', 79.3, 'B8IV', 3, 'closest B-type star; B8IV + K2V + M4V', 'closest B-type star — custom init recommended'),
  s('7 Andromedae', '23 12 33.00351', '+49 24 22.3459', 79.6, 'F1V', 1),
  s('HD 195564', '20 32 23.695', '-09 51 12.18', 79.6, 'G2V', 1),
  s('Merak', '11 01 50.47654', '+56 22 56.7339', 79.7, 'A1IVps', 1, 'Beta Ursae Majoris (Big Dipper); debris disk'),
  s('MT Pegasi', '23 03 04.977', '+20 55 06.86', 79.31, 'G1V', 1),
  s('HD 156668', '17 17 40.48961', '+29 13 38.0184', 79.34, 'K3V', 1, '2 planets'),
  s('37 Ceti', '01 14 23.97', '-07 55 24.6', 79.49, 'F5V', 1),
];

// --- aliases for names that already exist in the scenario under another label
const KNOWN_ALIASES = {
  'helvetios': '51 pegasi',
  'tau bootis': 'tau bootis',
};

const norm = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');

function run() {
  const args = process.argv.slice(2);
  const scenarioPath = fileURLToPath(
    new URL('../../map/setup_scenarios/the_stellar_neighborhood_scenario.txt', import.meta.url));

  if (args.includes('--selftest')) {
    const cases = [
      ['Sgr A* (gal. center)', '17 45 40.04', '-29 00 28.1', 0, 0],
      ['Aldebaran', '04 35 55.239', '+16 30 33.49', 181, -20],
      ['Vega', '18 36 56.336', '+38 47 01.28', 67.4, 19.2],
      ['Regulus', '10 08 22.311', '+11 58 01.95', 226, 49],
    ];
    console.log('Self-test (expected l, b in degrees):');
    for (const [name, ra, dec, el, eb] of cases) {
      const { l, b } = equatorialToGalactic(parseRA(ra), parseDec(dec));
      console.log(`  ${name.padEnd(22)} l=${l.toFixed(2).padStart(7)}  b=${b.toFixed(2).padStart(7)}   (expect ~${el}, ~${eb})`);
    }
    return;
  }

  const scenario = readFileSync(scenarioPath, 'utf8');

  // Existing names + positions, and max numeric id.
  const existingNames = new Set();
  for (const m of scenario.matchAll(/name\s*=\s*"([^"]+)"/g)) existingNames.add(norm(m[1]));
  for (const [k, v] of Object.entries(KNOWN_ALIASES)) {
    if (existingNames.has(norm(v))) existingNames.add(norm(k));
  }
  const existingPos = [];
  for (const m of scenario.matchAll(/name\s*=\s*"([^"]+)"[^}]*position\s*=\s*\{\s*x\s*=\s*(-?\d+)\s*y\s*=\s*(-?\d+)/g)) {
    existingPos.push({ name: m[1], x: +m[2], y: +m[3] });
  }
  let maxId = 0;
  for (const m of scenario.matchAll(/id\s*=\s*"?(\d+)"?/g)) maxId = Math.max(maxId, +m[1]);

  if (scenario.includes('Expansion batch 4') && args.includes('--write')) {
    console.error('Refusing to --write: scenario already contains "Expansion batch 4".');
    process.exit(1);
  }

  let id = maxId + 1;
  const placed = []; // {name,x,y}
  const skipped = [];
  const blocks = [];
  const todoList = [];

  for (const star of STARS) {
    if (existingNames.has(norm(star.name))) {
      skipped.push(`${star.name} (already in scenario)`);
      continue;
    }
    const { l, b } = equatorialToGalactic(parseRA(star.ra), parseDec(star.dec));
    const { x, y } = position(star.dist, l);
    const { init, color, word, todos } = pickInit(star.cls, star.n, star.todo);

    // proximity check (informational)
    let near = null, nd = Infinity;
    for (const p of [...existingPos, ...placed]) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < nd) { nd = d; near = p.name; }
    }
    const proximity = nd <= 4 ? `  # NOTE: ~${nd.toFixed(0)} units from ${near}` : '';

    const header = [`\t# ${star.name} — ${star.cls}, ${star.dist} ly, ${word}` +
      (star.note ? ` — ${star.note}` : '')];
    header.push(`\t# l ${l.toFixed(1)}° b ${b.toFixed(1)}°`);
    for (const t of todos) header.push(`\t# TODO: ${t}`);

    blocks.push(
      header.join('\n') + '\n' +
      `\tsystem = {\n` +
      `\t\tid = "${id}" name = "${star.name}" position = { x = ${x} y = ${y} }${proximity}\n` +
      `\t\tinitializer = ${init}\n` +
      `\t\t}`
    );

    if (todos.length) todoList.push(`  id ${id} ${star.name}: ${todos.join('; ')}`);
    placed.push({ name: star.name, x, y });
    id++;
  }

  const out =
    `\n\t# --- Expansion batch 4: IDs ${maxId + 1}–${id - 1} ` +
    `(50–80 ly shell, generated by radec_to_position.mjs) ---\n` +
    blocks.join('\n\n') + '\n';

  if (args.includes('--write')) {
    const cut = scenario.lastIndexOf('}');
    const next = scenario.slice(0, cut) + out + '\n' + scenario.slice(cut);
    writeFileSync(scenarioPath, next);
    console.log(`Wrote ${placed.length} systems (IDs ${maxId + 1}-${id - 1}) into the scenario.`);
  } else {
    console.log(out);
  }

  console.error(`\n=== SUMMARY ===`);
  console.error(`Placed:  ${placed.length} systems (IDs ${maxId + 1}-${id - 1})`);
  console.error(`Skipped: ${skipped.length}${skipped.length ? ' -> ' + skipped.join(', ') : ''}`);
  console.error(`TODO flags (${todoList.length}):`);
  for (const t of todoList) console.error(t);
}

run();
