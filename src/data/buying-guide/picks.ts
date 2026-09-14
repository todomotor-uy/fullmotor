/**
 * Top TodoMotor — árbol curado de la guía de compra.
 *
 * Nodos = uso × franja de precio. Cada pick es una versión concreta del
 * catálogo (slug) con 2–4 razones editoriales que se muestran tal cual.
 * Reglas: una familia de modelo por nodo, precio dentro de la franja,
 * carrocería válida para el uso. `npm run guide:check` valida todo contra la
 * API viva. Ver README.md en esta carpeta.
 */

import type { CuratedNode } from '@/lib/buying-guide/types'

export const PICKS_UPDATED_AT = '2026-09-14'

export const CURATED_PICKS: CuratedNode[] = [
  // ───────────────────────────── FAMILIA ─────────────────────────────
  {
    use: 'familia', band: 'hasta-20k',
    picks: [
      { slug: 'uy-hyundai-hb20s-2025-10-comfort-m-t', why: ['6 airbags y frenado autónomo de emergencia de serie', 'Baúl de 475 L, raro en el segmento', 'Marca con red de servicio consolidada'] },
      { slug: 'uy-chevrolet-onix-plus-2025-lt-10', why: ['Sedán de 4,61 m con baúl de 475 L', '6 airbags y cámara de retroceso', 'Uno de los más vendidos del país: fácil reventa y repuestos'] },
      { slug: 'uy-suzuki-dzire-hybrid-2025-1-2-glx-m-t', why: ['Híbrido liviano: consumo muy bajo en ciudad', '6 airbags y climatizador', 'Baúl de 378 L'], note: 'Hay dos fichas Dzire casi iguales; usamos esta (378 L, clima).' },
      { slug: 'uy-volkswagen-polo-2025-track-1-0-mpi-m-t', why: ['6 airbags y baúl de 351 L, amplio para un hatch', 'Control crucero, climatizador y cámara de retroceso', 'Respaldo de la red VW y buena reventa'] },
    ],
  },
  {
    use: 'familia', band: '20-30k',
    picks: [
      { slug: 'uy-volkswagen-virtus-2025-1-0-tsi-comfortline-a-t', why: ['Baúl de 521 L, el más grande de su clase', '6 airbags y control crucero adaptativo', 'Motor 1.0 TSI de 116 hp con caja automática'] },
      { slug: 'uy-jetour-x70-2025-comfort-15t-m-t', why: ['SUV mediano de 4,72 m por precio de compacto', '6 airbags, frenado autónomo y detector de punto ciego', 'Cámara 360 y techo panorámico de serie'], note: 'Caja manual; la Luxury DCT queda en 29.990.' },
      { slug: 'uy-jeep-avenger-2026-longitude-t200-hybrid-mhev-10-cvt', why: ['6 asistencias: frenado autónomo, carril y crucero adaptativo', 'Micro-híbrido MHEV 1.0 turbo de 116 hp y 200 Nm', 'Respaldo de la red Jeep/Stellantis en Uruguay'] },
      { slug: 'uy-chevrolet-tracker-2025-lt-1-2-turbo-a-t', why: ['6 airbags y motor 1.2 turbo de 133 hp', 'Baúl de 390 L y climatizador', 'Red Chevrolet en todo el país'] },
      { slug: 'uy-kia-k3-sed-n-2025-ex-1-4-a-t', why: ['Baúl de 544 L, ideal para valijas y cochecito', '6 airbags, frenado autónomo y asistente de carril', 'Caja automática y climatizador de serie'] },
    ],
  },
  {
    use: 'familia', band: '30-45k',
    picks: [
      { slug: 'uy-toyota-corolla-cross-2025-hybrid-xei', why: ['Híbrido Toyota: consumo bajo y confiabilidad probada', '7 airbags y paquete Toyota Safety Sense', 'Baúl de 440 L y excelente reventa'] },
      { slug: 'uy-tesla-model-y-2026-premium-standard-range-rwd-63-kwh', why: ['Eléctrico con 466 km de autonomía', '9 airbags y control crucero adaptativo', 'Espacio de carga de 822 L y 299 hp'] },
      { slug: 'uy-volkswagen-taos-2025-1-4-tsi-comfortline-a-t', why: ['Baúl de 530 L en 4,46 m de largo', '1.4 TSI de 150 hp con caja automática', '6 airbags y control crucero adaptativo'] },
      { slug: 'uy-chery-tiggo-7-csh-2025-15t-dht', why: ['Híbrido enchufable: 950 km de autonomía combinada', '7 airbags con AEB, carril y crucero adaptativo', 'Baúl de 510 L, cámara 360 y techo panorámico'] },
      { slug: 'uy-byd-song-plus-2025-gl', why: ['SUV mediano de 4,70 m con baúl de 574 L', 'Híbrido enchufable DM-i con 105 km eléctricos', '6 airbags, frenado autónomo y punto ciego'] },
    ],
  },
  {
    use: 'familia', band: '45-70k',
    picks: [
      { slug: 'uy-toyota-rav4-2026-hybrid-s-plus-25-ecvt-2wd', why: ['Híbrido de 226 hp con consumo de compacto', '7 airbags y Toyota Safety Sense completo', 'Baúl de 514 L y reventa muy sólida'] },
      { slug: 'uy-hyundai-tucson-hybrid-2025-limited-16-t-gdi-2wd-a-t', why: ['Híbrido de 230 hp y 350 Nm', '6 airbags con AEB, carril, crucero adaptativo y punto ciego', 'Baúl de 539 L y techo panorámico'] },
      { slug: 'uy-nissan-x-trail-2026-e-power-e-4orce-advance', why: ['e-POWER: andar de eléctrico sin enchufar', 'Tracción integral e-4ORCE y baúl de 575 L', '6 airbags, punto ciego y alerta de tráfico cruzado'] },
      { slug: 'uy-mazda-cx-5-2025-2-0-skyactiv-g-2wd-urban-a-t', why: ['10 airbags, el máximo del segmento', 'Crucero adaptativo, punto ciego y asistente de carril', 'Baúl de 506 L y calidad de armado reconocida'] },
      { slug: 'uy-jeep-commander-2025-limited-1-3-t270-at6-fwd', why: ['7 plazas en 4,77 m', '6 airbags, frenado autónomo y asistente de carril', '1.3 turbo de 175 hp y 270 Nm'] },
    ],
  },
  {
    use: 'familia', band: 'mas-70k',
    picks: [
      { slug: 'uy-hyundai-santa-fe-hybrid-2026-calligraphy-16-t-gdi-a-t-awd', why: ['Baúl de 628 L y tracción integral', '7 airbags y ADAS completo', 'Híbrido de 215 hp con head-up display y audio premium'] },
      { slug: 'uy-kia-sorento-2026-hev-ex-plus-awd', why: ['SUV híbrido de 7 plazas con tracción integral', '8 airbags, AEB, carril y crucero adaptativo', '238 hp y 367 Nm'] },
      { slug: 'uy-kia-carnival-hev-2025-ex-plus-1-6-t-gdi-a-t', why: ['La minivan familiar: 5,15 m y 1.138 L de baúl', '8 airbags con AEB, carril, punto ciego y tráfico cruzado', 'Híbrido de 242 hp con cámara 360'] },
      { slug: 'uy-volvo-xc90-2025-recharge-plus-t8-awd-2-0-t-a-t', why: ['Referente en seguridad: ADAS completo de serie', 'Híbrido enchufable de 455 hp con tracción integral', '7 plazas en 4,95 m'] },
      { slug: 'uy-mazda-cx-9-2025-2-5-turbo-skyactiv-g-awd-high-a-t', why: ['10 airbags y ADAS completo', '7 plazas, tracción integral y 2.5 turbo de 231 hp', 'Head-up display y cámara 360'] },
    ],
  },

  // ───────────────────────────── CIUDAD ─────────────────────────────
  {
    use: 'ciudad', band: 'hasta-20k',
    picks: [
      { slug: 'uy-hyundai-hb20-2025-10-comfort-m-t', why: ['6 airbags, AEB y asistente de carril desde 16.990', '3,94 m: fácil de estacionar', 'Red Hyundai y buena reventa'] },
      { slug: 'uy-leapmotor-t03-2025-luxury', why: ['Eléctrico con 280 km de autonomía por 19.990', '6 airbags, AEB y asistente de carril', '3,62 m, ideal para el centro'] },
      { slug: 'uy-volkswagen-polo-2025-track-1-0-mpi-m-t', why: ['6 airbags y baúl de 351 L', 'Climatizador, cámara y control crucero de serie', 'Respaldo de la red VW'] },
      { slug: 'uy-byd-seagull-2025-gl', why: ['Eléctrico de 300 km de autonomía', 'CarPlay, cámara y sensores de estacionamiento', '3,78 m y bajo costo por km'] },
      { slug: 'uy-chevrolet-onix-2025-lt-1-0', why: ['6 airbags y acceso sin llave', 'Uno de los hatch más vendidos: repuestos y reventa', 'Motor 1.0 de bajo consumo'] },
    ],
  },
  {
    use: 'ciudad', band: '20-30k',
    picks: [
      { slug: 'uy-suzuki-swift-hybrid-2025-1-2-glx-cvt', why: ['Híbrido liviano de 3,86 m: consumo mínimo en ciudad', '6 airbags con AEB, carril y crucero adaptativo', 'Caja automática CVT y climatizador'] },
      { slug: 'uy-byd-yuan-pro-dm-i-2026-gl-785-kwh', why: ['SUV compacto híbrido de 166 hp y 300 Nm', 'Frenado autónomo, asistente de carril y crucero adaptativo', 'Baúl de 425 L, climatizador y cámara de retroceso', 'N.º 1 en ventas de SUV 2026 en Uruguay (ACAU)'] },
      { slug: 'uy-ora-03-2025-skin-47-8-kwh', why: ['Eléctrico con 400 km de autonomía', '7 airbags y ADAS completo', 'Cámara 360 y 171 hp'] },
      { slug: 'uy-chevrolet-onix-2025-premier-1-0-turbo-a-t', why: ['1.0 turbo de 116 hp con caja automática', '6 airbags y acceso sin llave', 'Red Chevrolet y repuestos accesibles'] },
      { slug: 'uy-mg-mg3-2026-hybrid-plus-e-at', why: ['Híbrido completo de 191 hp: rápido y ahorrador', '7 airbags, AEB y asistente de carril', 'Caja automática y 4,12 m'] },
    ],
  },
  {
    use: 'ciudad', band: '30-45k',
    picks: [
      { slug: 'uy-toyota-yaris-cross-2025-hybrid-xei', why: ['Híbrido Toyota de 4,31 m con baúl de 391 L', '7 airbags y Toyota Safety Sense', 'Consumo mínimo y reventa asegurada'] },
      { slug: 'uy-byd-yuan-plus-2025-gs', why: ['Eléctrico con 480 km de autonomía', '6 airbags, AEB, carril y punto ciego', '201 hp y baúl de 440 L'] },
      { slug: 'uy-leapmotor-b10-2026-life', why: ['Eléctrico de 440 km y 218 hp por 30.990', '7 airbags y ADAS completo', 'Baúl de 430 L y techo panorámico'] },
      { slug: 'uy-honda-wr-v-2025-ex-l-15-cvt', why: ['6 airbags, AEB, carril y crucero adaptativo', 'Confiabilidad Honda y consumo bajo', 'Interior en cuero y climatizador'] },
      { slug: 'uy-volvo-ex30-2025-core-single-engine-e40-rwd-51-kwh', why: ['Eléctrico premium de 4,23 m con 272 hp', '7 airbags, AEB, carril y crucero adaptativo', 'Seguridad Volvo a precio de compacto generalista'] },
    ],
  },
  {
    use: 'ciudad', band: '45-70k',
    picks: [
      { slug: 'uy-kia-ev3-2025-light-2wd-long-range-81-4-kwh', why: ['Eléctrico con 605 km de autonomía', '6 airbags, AEB, carril, punto ciego y tráfico cruzado', 'Baúl de 541 L en 4,30 m'] },
      { slug: 'uy-hyundai-kona-hybrid-2025-limited-16-gdi-dct', why: ['Híbrido de bajo consumo con caja DCT', '6 airbags y ADAS completo', 'Baúl de 466 L y techo panorámico'] },
      { slug: 'uy-mini-cooper-2025-se-favoured-542-kwh', why: ['Eléctrico de 218 hp y 402 km', 'Ícono urbano premium de 3,86 m', '6 airbags, AEB y asistente de carril'] },
      { slug: 'uy-honda-zr-v-2026-ehev-touring-20-ecvt', why: ['Híbrido e:HEV de 184 hp y 315 Nm', '7 airbags, carril, crucero adaptativo y punto ciego', 'Interior en cuero y climatizador'] },
      { slug: 'uy-volkswagen-id-4-2025-pro-77-kwh', why: ['Eléctrico de 420 km con baúl de 543 L', '6 airbags y control crucero adaptativo', 'Red VW para el servicio del eléctrico'] },
    ],
  },
  {
    use: 'ciudad', band: 'mas-70k',
    picks: [
      { slug: 'uy-mercedes-benz-clase-a-2025-a-200-progressive-7g-dct', why: ['Hatch premium de 4,42 m con 163 hp', '6 airbags, AEB y asistente de carril', 'Entrada a Mercedes-Benz desde 72.990'] },
      { slug: 'uy-audi-a3-sportback-2025-s-line-plus-35-tfsi-1-4-tiptronic', why: ['1.4 TFSI de 150 hp con caja automática', '6 airbags, AEB y asistente de carril', 'Estética S line y baúl de 380 L'] },
      { slug: 'uy-bmw-ix1-2025-ix1-edrive20-xline-plus-647-kwh', why: ['Eléctrico BMW con 450 km de autonomía', '201 hp y baúl de 405 L', 'Techo panorámico y asientos eléctricos'] },
      { slug: 'uy-mini-countryman-2025-e-favoured-646-kwh', why: ['Eléctrico de 430 km y 204 hp', 'Baúl de 460 L, el MINI más práctico', '6 airbags, AEB y asistente de carril'] },
      { slug: 'uy-land-rover-range-rover-evoque-2026-s-awd-2-0-mhev-p200-a-t', why: ['SUV compacto premium con tracción integral', 'Baúl de 591 L y cámara 360', 'AEB, carril, crucero adaptativo y tráfico cruzado'] },
    ],
  },

  // ───────────────────────────── TRABAJO ─────────────────────────────
  {
    use: 'trabajo', band: 'hasta-20k',
    picks: [
      { slug: 'uy-volkswagen-saveiro-2025-trendline-1-6-cs-m-t', why: ['6 airbags, la más segura de la franja', 'Motor 1.6 de 110 hp y 155 Nm', 'Red VW en todo el país'] },
      { slug: 'uy-fiat-strada-2025-endurance-cabina-plus-1-3-m-t', why: ['Precio de entrada: 16.690 con caja de 844 L', 'Cabina Plus con espacio detrás de los asientos', '1.3 de 107 hp, líder de ventas en la región'] },
      { slug: 'uy-renault-oroch-2025-cargo-1-6-sce-m-t-2wd', why: ['Doble cabina por menos de 20.000', '1.6 de 114 hp y caja de 683 L', 'Cámara y sensores de retroceso'] },
      { slug: 'uy-foton-wonder-cabina-doble-2025-1-6', why: ['Doble cabina de 4,87 m a 17.950', '1.6 de 120 hp', 'Caja de carga amplia (1.650 L)'] },
      { slug: 'uy-chevrolet-n400-max-2025-15-mt', why: ['Furgón compacto: alternativa a la pickup para reparto', '1.5 de 105 hp con control crucero', 'Cámara y sensores de retroceso'], note: 'Es furgón de carga, no auto familiar; solo aplica a trabajo.' },
    ],
  },
  {
    use: 'trabajo', band: '20-30k',
    picks: [
      { slug: 'uy-fiat-toro-2026-freedom-13-t270-at6', why: ['1.3 turbo de 175 hp y 270 Nm con caja automática', '6 airbags y caja de 937 L', 'Confort de auto: climatizador y asientos eléctricos'] },
      { slug: 'uy-chevrolet-montana-2027-ltz-12t-at', why: ['6 airbags y frenado autónomo de emergencia', 'Caja de 874 L y motor 1.2 turbo automático', 'Red Chevrolet y bajo costo de mantenimiento'] },
      { slug: 'uy-gwm-poer-2025-2-0-t-tool-elite-4x4-m-t', why: ['Tracción 4x4 y 2.0 turbo de 163 hp por 27.990', 'Pickup de tamaño completo (5,42 m)', 'Climatizador y CarPlay de serie'] },
      { slug: 'uy-foton-tunland-g7-2025-2-0t-4x2-m-t', why: ['6 airbags, AEB y detector de punto ciego', '2.0 turbo de 163 hp y caja de 1.800 L', 'Cámara 360 y tapizado en cuero'] },
      { slug: 'uy-volkswagen-saveiro-2025-trendline-1-6-cd-m-t', why: ['Doble cabina con 6 airbags', 'Climatizador, cámara y control crucero', '1.6 de 110 hp, mecánica probada'] },
    ],
  },
  {
    use: 'trabajo', band: '30-45k',
    picks: [
      { slug: 'uy-nissan-frontier-2025-se-4x4-2-3-tdi-m-t', why: ['Diésel 2.3 biturbo de 190 hp y 450 Nm', 'Tracción 4x4 y 6 airbags', 'Climatizador, cámara y control crucero'] },
      { slug: 'uy-toyota-hilux-2025-2-7-vvt-i-sr-4x2', why: ['La pickup más vendida: reventa y repuestos garantizados', '7 airbags y asistente de carril', '2.7 nafta de 164 hp'], note: 'Entrada a Hilux; las diésel arrancan en 52.490.' },
      { slug: 'uy-chery-himla-2025-23-4x4-mt', why: ['Diésel 2.3 de 360 Nm con 4x4 por 35.990', '7 airbags y caja de 1.500 L', 'Cámara 360 y climatizador'] },
      { slug: 'uy-riddara-rd6-eco-4wd-2025-rd6-eco-4wd', why: ['Eléctrico: 375 hp y 485 Nm con tracción 4x4', '390 km de autonomía y frenado autónomo de emergencia', 'Caja de carga de 1.200 L, cámara y acceso sin llave', 'Entre los 10 utilitarios más vendidos 2026 en Uruguay (ACAU)'] },
      { slug: 'uy-mitsubishi-l200-2025-glx-24-mpi-mt-2wd', why: ['7 airbags, AEB y detector de punto ciego', 'Caja de 1.500 L y 2.4 de 155 hp', 'Robustez L200 con red Mitsubishi'] },
    ],
  },
  {
    use: 'trabajo', band: '45-70k',
    picks: [
      { slug: 'uy-toyota-hilux-2025-28-srv-4x4-mt', why: ['Diésel 2.8 de 201 hp y 500 Nm', 'Tracción 4x4 y 6 airbags', 'Reventa imbatible en el mercado uruguayo'] },
      { slug: 'uy-volkswagen-amarok-2025-highline-2-0-tdi-4x4-a-t', why: ['Diésel 2.0 de 180 hp y 405 Nm con caja automática', 'Tracción 4x4 y 6 airbags por 45.490', 'Climatizador y control crucero adaptativo'] },
      { slug: 'uy-chevrolet-s10-2025-wt-28-ctdi-4x4-at8', why: ['Diésel 2.8 de 204 hp y 510 Nm de torque', 'Tracción 4x4 con caja automática de 8 marchas', '6 airbags y caja de 1.050 L'] },
      { slug: 'uy-multimotors-ranger-xls-sit-2025-2-0-4x4-m-t', why: ['Nueva Ranger: 2.0 diésel de 170 hp y 405 Nm', 'Tracción 4x4 y 6 airbags', 'Caja de 1.700 L y red Ford'] },
      { slug: 'uy-ram-dakota-2026-big-horn-22-td-at8-4x4', why: ['Diésel 2.2 de 200 hp y 450 Nm con AT8', '4x4, 6 airbags, AEB, carril y punto ciego', 'Caja de 1.210 L y asientos calefaccionados'] },
    ],
  },
  {
    use: 'trabajo', band: 'mas-70k',
    picks: [
      { slug: 'uy-toyota-hilux-2025-28-srx-4x4-at-tss', why: ['Tope de gama: 2.8 diésel de 201 hp y 500 Nm', '7 airbags y Toyota Safety Sense completo', 'Head-up display, cuero y audio premium'] },
      { slug: 'uy-multimotors-ranger-xls-v6-2025-3-0-4wd-at10', why: ['V6 3.0 diésel de 250 hp y 567 Nm', 'Caja automática de 10 marchas y 4x4', '6 airbags y caja de 1.700 L'] },
      { slug: 'uy-volkswagen-amarok-2025-30-v6-tdi-highline-4x4-at', why: ['V6 3.0 TDI de 258 hp y 580 Nm', 'AEB, crucero adaptativo, cámara 360 y head-up', 'Tracción 4x4 y 6 airbags'] },
      { slug: 'uy-ram-1500-2025-big-horn-black-edition-36-v6-etorque-a-t-4x4', why: ['Full-size de 5,92 m: 3.6 V6 eTorque de 305 hp', 'Caja de 1.300 L, 570 Nm y 4x4', '6 airbags y crucero adaptativo'] },
      { slug: 'uy-multimotors-f-150-2025-3-5-v6-ecoboost-lariat-selectshift', why: ['Ícono full-size: 3.5 V6 EcoBoost de 400 hp y 560 Nm', 'Caja de 1.550 L y 5,91 m', '6 airbags y equipamiento Lariat'] },
    ],
  },

  // ───────────────────────────── RUTA ─────────────────────────────
  {
    use: 'ruta', band: 'hasta-20k',
    picks: [
      { slug: 'uy-hyundai-hb20s-2025-10-comfort-m-t', why: ['6 airbags, AEB y asistente de carril', 'Baúl de 475 L para viajar con valijas', 'Sedán de 4,32 m estable en ruta'] },
      { slug: 'uy-chevrolet-onix-plus-2025-lt-10', why: ['Sedán de 4,61 m con baúl de 475 L', '6 airbags y sensores de estacionamiento', 'Red Chevrolet en todo el país'] },
      { slug: 'uy-suzuki-dzire-hybrid-2025-1-2-glx-m-t', why: ['Híbrido liviano: consumo muy bajo en ruta', '6 airbags y climatizador', 'Baúl de 378 L'] },
      { slug: 'uy-jetour-x50-2025-comfort-15-m-t', why: ['1.5 de 115 hp y 150 Nm, con más resto que los 1.0', 'SUV de 4,40 m con baúl de 420 L', 'Control crucero, cuero y acceso sin llave'] },
    ],
  },
  {
    use: 'ruta', band: '20-30k',
    picks: [
      { slug: 'uy-volkswagen-virtus-2025-1-0-tsi-highline-a-t', why: ['1.0 TSI de 200 Nm: cómodo a velocidad de ruta', 'Baúl de 521 L y control crucero adaptativo', '6 airbags y climatizador'] },
      { slug: 'uy-nissan-sentra-2025-sense-2-0-cvt', why: ['Sedán de 4,66 m con 2.0 de 149 hp', 'Baúl de 510 L y 6 airbags', 'Interior en cuero y climatizador'] },
      { slug: 'uy-jetour-x70-2025-luxury-15t-dct', why: ['SUV mediano de 4,72 m con caja automática', '6 airbags, AEB y detector de punto ciego', 'Cámara 360, techo panorámico y crucero'] },
      { slug: 'uy-chery-tiggo-4-csh-2025-luxury-15-dht', why: ['Híbrido enchufable: 900 km de autonomía combinada', '6 airbags y baúl de 480 L', 'Control crucero, cuero y climatizador'] },
      { slug: 'uy-chevrolet-tracker-2025-lt-1-2-turbo-a-t', why: ['1.2 turbo de 133 hp con caja automática', '6 airbags y climatizador', 'Red Chevrolet en todo el interior'] },
    ],
  },
  {
    use: 'ruta', band: '30-45k',
    picks: [
      { slug: 'uy-toyota-corolla-2025-hybrid-xei', why: ['Híbrido Toyota: consumo mínimo en ruta', '7 airbags, AEB, carril y crucero adaptativo', 'Baúl de 471 L y reventa asegurada'] },
      { slug: 'uy-omoda-and-jaecoo-omoda-5-2025-shs-premium-15t-dht', why: ['Híbrido de 150 hp con 750 km de autonomía total', 'Baúl de 510 L y techo panorámico', 'Cámara 360°, audio premium y asientos eléctricos', 'Entre los 10 SUV más vendidos 2026 en Uruguay (ACAU)'] },
      { slug: 'uy-renault-boreal-2026-iconic', why: ['SUV nuevo de 4,56 m con baúl de 586 L', '6 airbags, AEB, carril, punto ciego y tráfico cruzado', '1.3 turbo de 156 hp y 270 Nm'] },
      { slug: 'uy-jeep-compass-2025-longitude-1-3-t270-at6-fwd', why: ['1.3 turbo de 180 hp y 270 Nm', '6 airbags, AEB y asistente de carril', 'Uno de los SUV más vendidos de Uruguay'] },
      { slug: 'uy-volkswagen-tiguan-2025-1-5-tsi-life-dsg', why: ['1.5 TSI de 150 hp con caja DSG', 'Baúl de 521 L y crucero adaptativo', '6 airbags y aplomo en ruta'] },
    ],
  },
  {
    use: 'ruta', band: '45-70k',
    picks: [
      { slug: 'uy-toyota-rav4-2026-hybrid-s-plus-25-ecvt-2wd', why: ['Híbrido de 226 hp con gran autonomía por tanque', '7 airbags y Toyota Safety Sense completo', 'Baúl de 514 L y reventa muy sólida'] },
      { slug: 'uy-subaru-forester-2025-25i-s-es-e-boxer-shev-cvt', why: ['Tracción integral simétrica permanente', '8 airbags y EyeSight: AEB, carril y crucero adaptativo', 'Híbrido de 203 hp y baúl de 520 L'] },
      { slug: 'uy-honda-cr-v-2025-e-hev-20-e-cvt-awd', why: ['Híbrido e:HEV de 204 hp con tracción integral', 'Baúl de 571 L y crucero adaptativo', 'Autonomía de 750 km por tanque'] },
      { slug: 'uy-kia-sportage-hev-2025-x-line-plus-1-6-t-gdi-a-t-2wd', why: ['Híbrido de 230 hp y 350 Nm', '7 airbags, AEB, punto ciego y tráfico cruzado', 'Cámara 360, techo panorámico y audio premium'] },
      { slug: 'uy-hyundai-ioniq-5-2025-safe-long-range-rwd-840-kwh', why: ['Eléctrico de 507 km con carga ultrarrápida 800 V', '6 airbags y ADAS completo', 'Baúl de 527 L y techo panorámico'] },
    ],
  },
  {
    use: 'ruta', band: 'mas-70k',
    picks: [
      { slug: 'uy-subaru-outback-2025-24r-touring-cvt-awd', why: ['2.4 turbo de 260 hp con tracción integral', '7 airbags y EyeSight completo', 'Baúl de 580 L: el rutero por definición'] },
      { slug: 'uy-volvo-xc60-2025-recharge-plus-t8-awd-2-0-t-a-t', why: ['Híbrido enchufable de 465 hp con AWD', '7 airbags y ADAS completo', 'Referente de seguridad y confort en viaje'] },
      { slug: 'uy-bmw-x3-2025-x3-20-2-0-t-xline-steptronic', why: ['Nueva generación X3: 2.0 turbo de 190 hp', '6 airbags, AEB y asistente de carril', 'Aplomo en ruta y red oficial BMW'] },
      { slug: 'uy-mercedes-benz-glc-2025-glc-200-4matic-core-eq-boost-9g-tronic-plus', why: ['4MATIC de 204 hp con mild hybrid', 'Baúl de 600 L y 6 airbags', 'AEB y asistente de carril'] },
      { slug: 'uy-land-rover-defender-110-2025-s-p400e-phev-awd-2-0-si4-a-t', why: ['Híbrido enchufable de 404 hp y 640 Nm', 'Baúl de 891 L y capacidad off-road real', '6 airbags, AEB y asistente de carril'] },
    ],
  },

  // ───────────────────────────── DEPORTIVO ─────────────────────────────
  {
    use: 'deportivo', band: 'hasta-20k',
    picks: [],
  },
  {
    use: 'deportivo', band: '20-30k',
    picks: [
      { slug: 'uy-mg-4-2025-standard-2wd-51-kwh', why: ['Tracción trasera y 170 hp, raro en el segmento', '400 km de autonomía y 6 airbags', 'Cámara 360 y crucero adaptativo'] },
      { slug: 'uy-mg-mg3-2026-hybrid-plus-e-at', why: ['Híbrido de 191 hp y 425 Nm en un hatch de 4,12 m', '7 airbags, AEB y asistente de carril', 'Precio de entrada al segmento: 24.990'] },
      { slug: 'uy-ora-03-2025-skin-47-8-kwh', why: ['Eléctrico de 171 hp y 250 Nm', '400 km de autonomía y 7 airbags', 'Diseño retro y ADAS completo'] },
    ],
  },
  {
    use: 'deportivo', band: '30-45k',
    picks: [
      { slug: 'uy-tesla-model-3-2026-premium-standard-range-rwd-63-kwh', why: ['283 hp con tracción trasera', '534 km de autonomía y 9 airbags', 'Baúl de 594 L: deportivo usable a diario'] },
      { slug: 'uy-fiat-fastback-2025-abarth-1-3-turbo-270-at6', why: ['1.3 turbo de 185 hp y 270 Nm afinado por Abarth', '6 airbags, AEB y asistente de carril', 'Techo panorámico y baúl de 516 L'] },
      { slug: 'uy-mg-4-2025-deluxe-awd-64-kwh', why: ['320 hp y 480 Nm con tracción integral', '520 km de autonomía y 6 airbags', 'Cámara 360 y crucero adaptativo'] },
      { slug: 'uy-volvo-ex30-2025-core-single-engine-e40-rwd-51-kwh', why: ['272 hp con tracción trasera', '7 airbags, AEB, carril y crucero adaptativo', 'Compacto premium de 4,27 m'] },
      { slug: 'uy-volkswagen-nivus-2026-gts-250-tsi-14-at', why: ['1.4 TSI de 150 hp y 250 Nm, el Nivus más potente', '6 airbags y ADAS completo', 'Interior en cuero y acceso sin llave'] },
    ],
  },
  {
    use: 'deportivo', band: '45-70k',
    picks: [
      { slug: 'uy-mazda-mx-5-2025-soft-top-2-0-skyactiv-g-m-t', why: ['Roadster puro: 181 hp, caja manual y tracción trasera', 'Menos de 3,92 m y capota de lona', '7 airbags y asistente de carril'] },
      { slug: 'uy-tesla-model-3-2026-performance-awd-85-kwh', why: ['460 hp con tracción integral', '571 km de autonomía y 9 airbags', 'Baúl de 594 L y techo de vidrio'] },
      { slug: 'uy-volkswagen-jetta-2025-gli-2-0-tsi-dsg', why: ['2.0 TSI de 228 hp y 350 Nm con DSG', 'Baúl de 510 L y 6 airbags', 'Crucero adaptativo y climatizador'] },
      { slug: 'uy-mini-cooper-2025-s-classic-2-0-t-dkg-steptronic', why: ['2.0 turbo de 204 hp y 300 Nm', 'Compacto de 3,86 m: ágil y liviano', '6 airbags, AEB y asistente de carril'] },
      { slug: 'uy-byd-seal-2025-4wd', why: ['523 hp y 670 Nm con tracción integral', '520 km de autonomía y 6 airbags', 'AEB, carril y punto ciego'] },
    ],
  },
  {
    use: 'deportivo', band: 'mas-70k',
    picks: [
      { slug: 'uy-porsche-911-2025-carrera-coup', why: ['El deportivo de referencia: 385 hp y motor bóxer', 'Caja PDK y crucero adaptativo', 'Cámara y sensores de estacionamiento'] },
      { slug: 'uy-bmw-m4-coup-2025-m4-competition-coup-3-0-t-m-steptronic-drivelogic', why: ['Seis cilindros biturbo de 503 hp', 'Coupé 2+2 con caja M Steptronic', '6 airbags y audio premium'] },
      { slug: 'uy-multimotors-mustang-gt-performance-2025-5-0-v8-at10', why: ['V8 5.0 atmosférico de 450 hp y 530 Nm', 'Caja automática de 10 marchas', '6 airbags y cámara de retroceso'] },
      { slug: 'uy-toyota-gr-yaris-2025-16t-mt', why: ['1.6 turbo de 300 hp y 400 Nm con AWD GR-Four', 'Caja manual de 6 marchas', '6 airbags y asientos calefaccionados'] },
      { slug: 'uy-mercedes-benz-clase-a-2025-a-35-4matic-amg-speedshift-dct-8g', why: ['2.0 turbo AMG de 306 hp y 400 Nm', 'Tracción integral 4MATIC y DCT de 8 marchas', '6 airbags, AEB y asistente de carril'] },
    ],
  },
]
