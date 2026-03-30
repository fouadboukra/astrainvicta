// Converts galactic (l, b, dist_ly) → Stellaris (x, y)
// Convention: x = dist*sin(l)*SCALE, y = dist*cos(l)*SCALE
// Uses full 3D distance (ignores cos(b) factor) so all stars sit at their true distance from Sol.
// Direction is galactic longitude only (galactic center l=0 → +Y, l=90° → +X).
const SCALE = 8;

const stars = [
  {id:0,   dist_ly:0,    l:0,      b:0},
  {id:1,   dist_ly:4.24, l:315.73, b:-0.68},
  {id:2,   dist_ly:5.96, l:31.01,  b:14.06},
  {id:3,   dist_ly:12.4, l:212.34, b:10.37},
  {id:4,   dist_ly:17.0, l:204.56, b:-10.14},
  {id:5,   dist_ly:11.46,l:213.70, b:13.02},
  {id:6,   dist_ly:8.60, l:227.23, b:-8.89},
  {id:7,   dist_ly:13.4, l:212.93, b:-6.19},
  {id:8,   dist_ly:18.6, l:206.93, b:-19.45},
  {id:9,   dist_ly:17.5, l:206.43, b:-27.47},
  {id:10,  dist_ly:18.9, l:193.71, b:-9.21},
  {id:11,  dist_ly:18.2, l:182.94, b:15.14},
  {id:12,  dist_ly:19.7, l:178.95, b:19.90},
  {id:13,  dist_ly:28.9, l:178.73, b:29.54},
  {id:14,  dist_ly:29.4, l:164.06, b:23.09},
  {id:15,  dist_ly:25.2, l:154.06, b:17.18},
  {id:16,  dist_ly:37.8, l:153.63, b:24.55},
  {id:17,  dist_ly:36.5, l:175.44, b:-18.09},
  {id:18,  dist_ly:20.7, l:164.94, b:42.67},
  {id:19,  dist_ly:15.9, l:165.87, b:52.15},
  {id:20,  dist_ly:28.6, l:176.90, b:74.77},
  {id:21,  dist_ly:16.2, l:216.46, b:54.58},
  {id:22,  dist_ly:17.1, l:207.55, b:36.47},
  {id:23,  dist_ly:11.7, l:197.01, b:32.42},
  {id:24,  dist_ly:8.29, l:185.12, b:65.43},
  {id:25,  dist_ly:7.86, l:244.05, b:56.12},
  {id:26,  dist_ly:11.0, l:270.15, b:59.56},
  {id:27,  dist_ly:14.9, l:261.0,  b:41.29},
  {id:28,  dist_ly:22.7, l:242.77, b:54.91},
  {id:29,  dist_ly:22.9, l:244.47, b:46.89},
  {id:30,  dist_ly:22.0, l:216.42, b:64.45},
  {id:31,  dist_ly:22.0, l:270.0,  b:55.0},
  {id:32,  dist_ly:28.6, l:176.90, b:74.77},
  {id:33,  dist_ly:27.6, l:136.13, b:75.31},
  {id:34,  dist_ly:29.9, l:168.53, b:73.78},
  {id:35,  dist_ly:26.2, l:147.85, b:65.72},
  {id:36,  dist_ly:29.6, l:136.87, b:48.74},
  {id:37,  dist_ly:30.0, l:43.50,  b:85.41},
  {id:38,  dist_ly:28.0, l:49.0,   b:81.0},
  {id:39,  dist_ly:30.0, l:65.14,  b:77.34},
  {id:40,  dist_ly:29.0, l:52.0,   b:71.0},
  {id:41,  dist_ly:21.9, l:23.09,  b:61.36},
  {id:42,  dist_ly:24.8, l:333.23, b:70.94},
  {id:43,  dist_ly:26.3, l:300.05, b:72.60},
  {id:44,  dist_ly:27.9, l:309.12, b:68.45},
  {id:45,  dist_ly:27.2, l:329.56, b:64.20},
  {id:46,  dist_ly:27.9, l:309.12, b:68.45},
  {id:47,  dist_ly:21.1, l:275.89, b:72.27},
  {id:48,  dist_ly:24.0, l:333.23, b:82.74},
  {id:49,  dist_ly:14.2, l:288.76, b:71.39},
  {id:50,  dist_ly:30.8, l:253.88, b:22.08},
  {id:51,  dist_ly:25.1, l:245.49, b:40.74},
  {id:52,  dist_ly:28.2, l:231.30, b:25.06},
  {id:53,  dist_ly:29.2, l:221.74, b:19.37},
  {id:54,  dist_ly:28.5, l:217.65, b:-2.17},
  {id:55,  dist_ly:17.0, l:205.37, b:30.45}, // GJ 2069 - using ~17 ly (uncertain)
  {id:56,  dist_ly:30.2, l:219.96, b:13.42},
  {id:57,  dist_ly:29.8, l:233.96, b:2.49},
  {id:58,  dist_ly:22.1, l:214.13, b:21.86},
  {id:59,  dist_ly:19.5, l:215.86, b:13.46},
  {id:60,  dist_ly:27.7, l:211.67, b:13.20},
  {id:61,  dist_ly:26.5, l:241.46, b:6.88},
  {id:62,  dist_ly:33.2, l:194.38, b:-13.65},
  {id:63,  dist_ly:28.2, l:188.46, b:-2.73},
  {id:64,  dist_ly:25.3, l:196.41, b:10.40},
  {id:65,  dist_ly:27.7, l:189.09, b:4.95},
  {id:66,  dist_ly:26.4, l:201.75, b:-9.67},
  {id:67,  dist_ly:27.3, l:221.72, b:-33.02},
  {id:68,  dist_ly:18.8, l:228.61, b:-18.44},
  {id:69,  dist_ly:33.0, l:204.40, b:-11.64},
  {id:70,  dist_ly:17.5, l:206.43, b:-27.47},
  {id:71,  dist_ly:26.2, l:191.45, b:-23.06},
  {id:72,  dist_ly:28.9, l:205.09, b:-27.18},
  {id:73,  dist_ly:29.0, l:226.80, b:-24.27},
  {id:74,  dist_ly:26.1, l:254.32, b:-17.51},
  {id:75,  dist_ly:27.8, l:254.54, b:5.58},
  {id:76,  dist_ly:16.3, l:200.77, b:-38.03},
  {id:77,  dist_ly:43.0, l:199.06, b:-52.22}, // HIP 15689 – use ~43 ly estimate (uncertain HIP)
  {id:78,  dist_ly:10.5, l:195.84, b:-48.05},
  {id:79,  dist_ly:12.8, l:250.53, b:-36.00},
  {id:80,  dist_ly:11.9, l:251.87, b:-52.90},
  {id:81,  dist_ly:19.7, l:250.75, b:-56.08},
  {id:82,  dist_ly:32.0, l:255.71, b:-44.50}, // GJ 2034 – capped at 32 ly
  {id:83,  dist_ly:30.0, l:228.67, b:-42.24}, // HIP 20968 – use ~30 ly estimate
  {id:84,  dist_ly:38.0, l:223.08, b:-59.87}, // GJ 1054 B – capped at 38 ly
  {id:85,  dist_ly:48.0, l:200.0,  b:-55.0},
  {id:86,  dist_ly:29.6, l:198.09, b:-45.99},
  {id:87,  dist_ly:30.3, l:178.22, b:-43.07},
  {id:88,  dist_ly:28.0, l:175.42, b:-43.17},
  {id:89,  dist_ly:48.0, l:170.0,  b:-45.0},
  {id:90,  dist_ly:23.6, l:163.40, b:-47.59},
  {id:91,  dist_ly:47.0, l:155.0,  b:-42.0},
  {id:92,  dist_ly:25.0, l:152.69, b:-30.75},
  {id:93,  dist_ly:24.9, l:138.88, b:-41.02},
  {id:94,  dist_ly:50.0, l:145.0,  b:-38.0},
  {id:95,  dist_ly:14.6, l:147.66, b:-46.49},
  {id:96,  dist_ly:11.9, l:173.10, b:-73.44},
  {id:97,  dist_ly:8.73, l:175.49, b:-75.70},
  {id:98,  dist_ly:14.1, l:121.88, b:-57.48},
  {id:99,  dist_ly:15.8, l:92.46,  b:-67.72},
  {id:100, dist_ly:16.3, l:83.92,  b:-76.20},
  {id:101, dist_ly:14.2, l:343.55, b:-75.90},
  {id:102, dist_ly:10.7, l:5.10,   b:-65.96},
  {id:103, dist_ly:11.1, l:47.07,  b:-56.98},
  {id:104, dist_ly:11.1, l:54.31,  b:-62.73},
  {id:105, dist_ly:15.2, l:52.00,  b:-59.63},
  {id:106, dist_ly:13.0, l:3.90,   b:-44.26},
  {id:107, dist_ly:11.9, l:336.19, b:-48.04},
  {id:108, dist_ly:16.2, l:349.17, b:-46.35},
  {id:109, dist_ly:18.3, l:30.16,  b:-34.22},
  {id:110, dist_ly:9.73, l:11.31,  b:-10.28},
  {id:111, dist_ly:20.1, l:354.81, b:-32.97},
  {id:112, dist_ly:19.6, l:5.23,   b:-30.93},
  {id:114, dist_ly:19.3, l:352.36, b:-23.90},
  {id:115, dist_ly:16.7, l:47.74,  b:-8.91},
  {id:116, dist_ly:28.7, l:15.62,  b:-29.40},
  {id:117, dist_ly:28.0, l:308.32, b:-51.92},
  {id:118, dist_ly:12.1, l:149.71, b:-78.76},
  {id:119, dist_ly:25.5, l:289.60, b:-59.66},
  {id:120, dist_ly:30.2, l:328.16, b:-40.29},
  {id:121, dist_ly:28.0, l:311.99, b:-39.57},
  {id:122, dist_ly:24.3, l:304.77, b:-39.78},
  {id:123, dist_ly:40.0, l:47.82,  b:28.22}, // HIP 85605 – Gaia says 1728 ly, use ~40 ly
  {id:124, dist_ly:23.6, l:40.61,  b:-54.56},
  {id:125, dist_ly:19.9, l:329.77, b:-32.42},
  {id:126, dist_ly:19.2, l:335.30, b:-14.45},
  {id:127, dist_ly:14.8, l:343.00, b:-6.78},
  {id:128, dist_ly:19.3, l:332.67, b:12.13},
  {id:129, dist_ly:16.3, l:345.99, b:-6.64},
  {id:130, dist_ly:30.0, l:327.32, b:-11.70}, // HIP 82725 – Gaia says 205 ly, use ~30 ly
  {id:131, dist_ly:13.4, l:212.93, b:-6.19},
  {id:132, dist_ly:13.4, l:212.94, b:-6.20}, // GJ 234 B – very slightly offset from A
  {id:133, dist_ly:31.0, l:292.56, b:-19.53},
  {id:134, dist_ly:26.6, l:280.20, b:-19.43},
  {id:135, dist_ly:21.2, l:287.26, b:-11.97},
  {id:136, dist_ly:13.2, l:278.0,  b:19.0},   // Innes' Star / DENIS J1048-3956
  {id:137, dist_ly:15.1, l:296.02, b:-2.86},
  {id:138, dist_ly:21.7, l:300.22, b:24.42},
  {id:139, dist_ly:35.9, l:292.36, b:9.63},
  {id:140, dist_ly:46.6, l:291.50, b:74.29},
  {id:141, dist_ly:29.6, l:284.88, b:27.65},
  {id:142, dist_ly:27.9, l:311.86, b:44.09},
  {id:143, dist_ly:21.7, l:300.22, b:24.42},
  {id:144, dist_ly:30.4, l:289.80, b:20.71},
  {id:145, dist_ly:29.0, l:294.12, b:44.17},
  {id:146, dist_ly:35.2, l:323.97, b:40.25},
  {id:147, dist_ly:40.1, l:288.32, b:46.62},
  {id:148, dist_ly:26.4, l:282.80, b:62.03},
  {id:149, dist_ly:19.3, l:338.24, b:32.68},
  {id:150, dist_ly:28.7, l:55.89,  b:-45.40},
  {id:151, dist_ly:19.2, l:338.24, b:32.68},
  {id:152, dist_ly:14.1, l:3.35,   b:23.68},
  {id:153, dist_ly:19.4, l:358.44, b:6.75},
  {id:154, dist_ly:46.0, l:357.36, b:-1.76},
  {id:155, dist_ly:22.3, l:351.84, b:1.42},
  {id:156, dist_ly:27.7, l:342.27, b:8.93},
  {id:157, dist_ly:31.6, l:349.13, b:27.71},
  {id:158, dist_ly:28.6, l:342.30, b:-5.27},
  {id:159, dist_ly:35.0, l:327.32, b:-11.70}, // HIP 82724 – use ~35 ly
  {id:160, dist_ly:20.2, l:11.04,  b:21.14},
  {id:161, dist_ly:16.6, l:29.89,  b:11.37},
  {id:162, dist_ly:19.3, l:40.45,  b:-3.28},
  {id:163, dist_ly:32.4, l:54.29,  b:13.14},
  {id:164, dist_ly:27.1, l:63.97,  b:11.07},
  {id:165, dist_ly:28.8, l:53.32,  b:6.07},
  {id:166, dist_ly:25.0, l:67.45,  b:19.24},
  {id:167, dist_ly:27.2, l:52.44,  b:25.63},
  {id:168, dist_ly:26.6, l:42.24,  b:24.30},
  {id:169, dist_ly:25.2, l:24.76,  b:19.98},
  {id:170, dist_ly:25.2, l:24.88,  b:8.87},
  {id:171, dist_ly:26.0, l:13.76,  b:2.15},
  {id:172, dist_ly:21.2, l:11.05,  b:21.16},
  {id:173, dist_ly:19.5, l:71.34,  b:35.97},
  {id:174, dist_ly:26.0, l:71.0,   b:36.0},
  {id:175, dist_ly:25.5, l:75.20,  b:44.04},
  {id:176, dist_ly:21.1, l:83.21,  b:42.79},
  {id:177, dist_ly:26.3, l:99.94,  b:15.06},
  {id:178, dist_ly:23.0, l:98.71,  b:11.09},
  {id:179, dist_ly:24.9, l:96.05,  b:27.90},
  {id:180, dist_ly:26.3, l:103.46, b:28.06},
  {id:181, dist_ly:27.2, l:91.45,  b:27.09},
  {id:182, dist_ly:24.4, l:53.53,  b:-16.76},
  {id:183, dist_ly:22.1, l:69.56,  b:-23.69},
  {id:184, dist_ly:29.7, l:83.25,  b:-21.16},
  {id:185, dist_ly:20.4, l:98.58,  b:-39.14},
  {id:186, dist_ly:28.7, l:55.89,  b:-45.40},
  {id:187, dist_ly:26.8, l:37.14,  b:-64.41},
  {id:188, dist_ly:24.2, l:121.51, b:-57.58},
  {id:189, dist_ly:24.3, l:43.24,  b:-39.86},
  {id:190, dist_ly:23.6, l:40.61,  b:-54.56},
  {id:191, dist_ly:29.0, l:37.82,  b:-59.07},
  {id:192, dist_ly:27.8, l:63.64,  b:-55.48},
  {id:193, dist_ly:35.0, l:65.21,  b:-71.20},
  {id:194, dist_ly:25.2, l:31.29,  b:-84.06},
  {id:195, dist_ly:27.2, l:331.65, b:-71.11},
  {id:196, dist_ly:34.0, l:13.80,  b:-66.88},
  {id:197, dist_ly:25.1, l:20.49,  b:-64.91},
  {id:198, dist_ly:23.4, l:83.26,  b:-59.25},
  {id:199, dist_ly:19.3, l:93.56,  b:-56.88},
  {id:200, dist_ly:20.1, l:98.58,  b:-39.14},
  {id:201, dist_ly:27.2, l:107.92, b:-24.33},
  {id:202, dist_ly:21.3, l:109.90, b:-3.20},
  {id:203, dist_ly:25.0, l:125.37, b:-7.87},
  {id:204, dist_ly:19.4, l:122.62, b:-5.06},
  {id:205, dist_ly:26.9, l:123.81, b:8.83},
  {id:206, dist_ly:32.1, l:124.31, b:-0.47},
  {id:207, dist_ly:16.5, l:100.61, b:-13.07},
  {id:208, dist_ly:20.2, l:101.43, b:30.69},
  {id:209, dist_ly:18.8, l:101.30, b:21.88},
  {id:210, dist_ly:17.6, l:126.85, b:37.95},
  {id:211, dist_ly:14.8, l:98.60,  b:31.96},
  {id:212, dist_ly:11.5, l:89.29,  b:24.23},
  {id:213, dist_ly:19.6, l:78.86,  b:8.51},
  {id:214, dist_ly:11.4, l:82.32,  b:-5.82},
  {id:215, dist_ly:13.1, l:104.69, b:-0.004},
  {id:216, dist_ly:10.3, l:110.0,  b:-16.94},
  {id:217, dist_ly:11.7, l:116.68, b:-18.45},
  {id:218, dist_ly:12.5, l:160.26, b:-37.03},

  // --- Expansion batch 1: named/notable stars IDs 219–242 ---
  {id:219, dist_ly:33.8,  l:192.23, b: 23.41},  // Pollux (β Gem) — K0 III, 1 exoplanet
  {id:220, dist_ly:36.7,  l: 15.05, b: 69.11},  // Arcturus (α Boo) — K1.5 III
  {id:221, dist_ly:42.9,  l:162.59, b:  4.57},  // Capella (α Aur) — G8+G0 III quadruple
  {id:222, dist_ly:35.9,  l:250.64, b: 70.80},  // Denebola (β Leo) — A3 Va
  {id:223, dist_ly:48.6,  l: 35.89, b: 22.57},  // Rasalhague (α Oph) — A5 IV binary
  {id:224, dist_ly:38.7,  l: 37.60, b:-46.01},  // Deneb Algedi (δ Cap) — A5 III binary
  {id:225, dist_ly:45.0,  l:118.99, b: 15.32},  // Gamma Cephei (Errai) — K1 IV binary, 1 exoplanet
  {id:226, dist_ly:41.0,  l:196.79, b: 37.70},  // 55 Cancri (Copernicus) — G8 V binary, 6 exoplanets
  {id:227, dist_ly:44.0,  l:132.00, b:-20.67},  // Upsilon Andromedae — F9 V binary, 3 exoplanets
  {id:228, dist_ly:45.3,  l:175.78, b: 63.37},  // 47 Ursae Majoris — G1 V, 3 exoplanets
  {id:229, dist_ly:46.1,  l:  4.70, b: 29.16},  // 18 Scorpii — G2 Va (nearest solar twin)
  {id:230, dist_ly:48.1,  l:327.08, b:  7.38},  // Nu2 Lupi (HD 136352) — G2 V, 3 exoplanets
  {id:231, dist_ly:35.0,  l:275.93, b:-61.96},  // Gliese 86 (HD 13445) — K1.5 V binary, 1 exoplanet
  {id:232, dist_ly:36.2,  l:119.17, b:-41.53},  // 54 Piscium (HD 3651) — K0.5 V, 1 exoplanet
  {id:233, dist_ly:42.1,  l:268.81, b:-30.34},  // HD 40307 — K2.5 V, 6 exoplanets
  {id:234, dist_ly:47.7,  l: 26.16, b: 23.61},  // GJ 1214 — M4.5 V, 1 exoplanet (water world)
  {id:235, dist_ly:49.3,  l:262.78, b:-45.32},  // Gliese 163 — M3.5 V, 3 exoplanets
  {id:236, dist_ly:30.9,  l:180.02, b:-17.43},  // Gliese 176 (HD 285968) — M2.5 V, 1 exoplanet
  {id:237, dist_ly:34.6,  l:144.60, b: -7.38},  // Iota Persei — G0 V (solar analog)
  {id:238, dist_ly:36.3,  l:141.17, b: -9.61},  // Theta Persei — F8 V
  {id:239, dist_ly:46.0,  l:224.73, b:-59.03},  // Alpha Fornacis (Dalim) — F6 V binary
  {id:240, dist_ly:46.6,  l: 97.87, b: 11.64},  // Eta Cephei — K0 IV
  {id:241, dist_ly:32.7,  l:129.09, b:  1.66},  // V987 Cassiopeiae (HR 10780) — K0 V
  {id:242, dist_ly:34.0,  l:335.06, b: 55.81},  // Gliese 536 (HD 122303) — M0 V, 2 exoplanets

  // --- Expansion batch 2: IDs 243–301 (59 stars, duplicates removed) ---
  {id:243, dist_ly:39.4,  l:266.97, b:-47.84},  // Zeta Reticuli — G1 V binary (UFO-lore)
  {id:244, dist_ly:35.7,  l:274.39, b: 60.86},  // Zavijava (β Virginis) — F9 V
  {id:245, dist_ly:38.2,  l:268.19, b:-33.37},  // Zeta Doradus — F7 V
  {id:246, dist_ly:51.0,  l: 73.11, b: 76.37},  // Tau Boötis — F7 V binary, 1 exoplanet (hot Jupiter)
  {id:247, dist_ly:27.1,  l: 51.88, b: 36.37},  // Mu Herculis — G5 IV triple
  {id:248, dist_ly:33.1,  l:301.22, b:-38.68},  // Alpha Mensae — G7 V (solar analog)
  {id:249, dist_ly:35.2,  l:148.14, b:-30.72},  // Delta Trianguli — G0 V
  {id:250, dist_ly:27.0,  l:205.21, b: 49.89},  // Gliese 380 — K7 V
  {id:251, dist_ly:21.2,  l:351.75, b: 40.15},  // Gliese 614 — K5 V binary
  {id:252, dist_ly:25.3,  l: 12.93, b: 23.79},  // Gliese 673 — K7 V
  {id:253, dist_ly:18.8,  l:285.38, b:-76.51},  // Gliese 60 — K8 V binary
  {id:254, dist_ly:30.7,  l:200.08, b: 21.89},  // GJ 3470 — M1.5 V, 1 exoplanet
  {id:255, dist_ly:41.0,  l:300.30, b: 28.35},  // GJ 1132 — M4 V, 1 exoplanet (rocky, possible atmosphere)
  {id:256, dist_ly:48.7,  l:178.42, b:-74.55},  // LHS 1140 — M4.5 V, best HZ super-Earth candidate
  {id:257, dist_ly:39.5,  l:192.04, b:-26.96},  // TRAPPIST-1 — M8 V, 7 planets (3 in HZ)
  {id:258, dist_ly:49.3,  l:262.02, b: 31.44},  // Gliese 317 — M2.5 V, 2 exoplanets
  {id:259, dist_ly:20.3,  l:  0.13, b: 40.83},  // Gliese 581 — M2.5 V, famous multiplanet system
  {id:260, dist_ly:15.3,  l: 42.48, b:-40.11},  // Gliese 876 — M4 V, first M-dwarf gas giant
  {id:261, dist_ly:36.4,  l:268.00, b: 22.22},  // HD 85512 — K6 V, 1 exoplanet (HZ candidate)
  {id:262, dist_ly:42.7,  l:345.94, b: 19.56},  // HD 147513 — G5 V binary, 1 exoplanet
  {id:263, dist_ly:18.8,  l:215.45, b:-28.99},  // Gliese 229 — M1 V binary (brown dwarf companion)
  {id:264, dist_ly:45.0,  l: 19.65, b: 30.86},  // Psi Serpentis — G5 V
  {id:265, dist_ly:48.5,  l: 42.56, b: 67.45},  // Zeta Boötis — F8 V binary
  {id:266, dist_ly:27.3,  l:174.11, b: 52.62},  // Alula Australis (ξ UMa) — G0 V binary
  {id:267, dist_ly:46.1,  l:148.43, b: 39.72},  // Pi1 Ursae Majoris — G1 V
  {id:268, dist_ly:34.9,  l:105.83, b: 65.85},  // Gliese 505 — G8 V binary
  {id:269, dist_ly:31.1,  l:149.34, b: 47.14},  // 61 Ursae Majoris — G8 V
  {id:270, dist_ly:43.8,  l:206.87, b: 25.76},  // Gliese 352 — G5 V
  {id:271, dist_ly:46.5,  l:236.40, b: 44.62},  // Gliese 395 — K1 V
  {id:272, dist_ly:43.7,  l: 15.97, b: 23.60},  // Gliese 664 — K0 V
  {id:273, dist_ly:50.9,  l: 82.34, b:-19.47},  // Helvetios (51 Pegasi) — G2 IV, first exoplanet host
  {id:274, dist_ly:50.6,  l:337.19, b: -3.76},  // Cervantes (Mu Arae) — G3 IV-V, 4 exoplanets
  {id:275, dist_ly:21.0,  l:214.97, b: 43.30},  // HD 97658 — K1 V, 1 exoplanet (super-Earth)
  {id:276, dist_ly:31.9,  l:186.59, b: 50.94},  // Gliese 436 — M2.5 V, 1 exoplanet
  {id:277, dist_ly:49.9,  l:185.44, b:-16.14},  // Gliese 195 — K5 V binary
  {id:278, dist_ly:40.3,  l:113.78, b:-82.20},  // Gliese 17 — G8 V
  {id:279, dist_ly:47.2,  l:129.10, b:-70.45},  // Gliese 26 — G4 V
  {id:280, dist_ly:47.1,  l:131.49, b:-62.31},  // Gliese 58 — G6 V
  {id:281, dist_ly:47.4,  l:299.55, b: 58.37},  // Gliese 519 — K1 V
  {id:282, dist_ly:41.6,  l: 38.45, b: -9.56},  // Gliese 768 — F7 V
  {id:283, dist_ly:40.9,  l: 27.41, b:-11.80},  // Gliese 764 — G8 V
  {id:284, dist_ly:27.7,  l: 43.30, b: 10.82},  // Gliese 720 — K5 V
  {id:285, dist_ly:21.0,  l: 95.08, b:-44.35},  // Gliese 879 — K6 V
  {id:286, dist_ly:12.1,  l:176.87, b:-68.48},  // YZ Ceti — M4.5 V, 3 exoplanets
  {id:287, dist_ly:22.4,  l:185.83, b:-53.31},  // LTT 1445 — M3 V binary, transiting exoplanet
  {id:288, dist_ly:34.6,  l:278.19, b:-32.03},  // L 98-59 — M3 V, 3 exoplanets
  {id:289, dist_ly:17.5,  l:190.65, b:-25.72},  // Gliese 3323 — M4 V, 2 exoplanets
  {id:290, dist_ly:21.2,  l: 99.80, b: -6.67},  // HD 219134 — K3 V, 6 exoplanets (nearest multi-planet K)
  {id:291, dist_ly:37.4,  l:111.05, b:-74.97},  // Gliese 9 — G3 V
  {id:292, dist_ly:47.7,  l: 68.67, b: 72.60},  // Theta Boötis (Asellus Primus) — F7 V
  {id:293, dist_ly:49.5,  l:252.27, b:-70.56},  // Nu Phoenicis — F9 V
  {id:294, dist_ly:47.5,  l:162.66, b:-44.71},  // Gliese 157 — G2 V
  {id:295, dist_ly:45.6,  l:136.24, b:-58.51},  // Gliese 47 — G0 V
  {id:296, dist_ly:45.3,  l:175.78, b:-40.33},  // Gliese 107 — G3 V
  {id:297, dist_ly:41.2,  l:167.03, b:-36.42},  // Gliese 140 — G6 V
  {id:298, dist_ly:42.0,  l:222.87, b: 30.66},  // Gliese 346 — K3 V
  {id:299, dist_ly:31.4,  l:295.71, b: 47.37},  // Gliese 488 — K4 V
  {id:300, dist_ly:49.1,  l:101.97, b:  9.03},  // Alderamin (α Cephei) — A7 V
  {id:301, dist_ly:36.5,  l: 38.80, b: -8.54},  // Gliese 740 — M3 V, 1 exoplanet
];

const results = {};
for (const s of stars) {
  const l = s.l * Math.PI / 180;
  const x = Math.round(s.dist_ly * Math.sin(l) * SCALE);
  const y = Math.round(s.dist_ly * Math.cos(l) * SCALE);
  results[s.id] = {x, y};
}

// Output as JSON for easy consumption
console.log(JSON.stringify(results, null, 0));
