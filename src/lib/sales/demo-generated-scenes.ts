type ScenePalette = {
  deep: string
  mid: string
  paper: string
  accent: string
}

function constructionScene(palette: ScenePalette, variant: number): string {
  const shift = (variant % 3) * 42
  return `<g>
    <rect width="1600" height="1000" fill="url(#scene)"/>
    <rect x="0" y="590" width="1600" height="410" fill="#17191b" opacity=".48"/>
    <path d="M0 620 460 ${320 + shift} 940 620Z" fill="${palette.mid}" opacity=".9"/>
    <path d="M0 620 460 ${320 + shift} 940 620" fill="none" stroke="${palette.paper}" stroke-opacity=".35" stroke-width="5"/>
    <path d="M460 ${320 + shift} 1110 420 1600 635V1000H460Z" fill="${palette.deep}" opacity=".88"/>
    <path d="M80 635h760v305H80Z" fill="#c7bca6" opacity=".72"/>
    <path d="M470 630h660v310H470Z" fill="#343a3c" opacity=".95"/>
    <path d="M505 668h190v210H505Zm228 0h190v210H733Zm228 0h130v210H961Z" fill="#9dc2c3" opacity=".44"/>
    <path d="M505 668h190M733 668h190M961 668h130M695 668v210M923 668v210" stroke="${palette.paper}" stroke-opacity=".28" stroke-width="5"/>
    <path d="M90 640h740M470 640h660" stroke="${palette.accent}" stroke-width="8" opacity=".9"/>
    <path d="M1250 470h220v470h-220Z" fill="#b8a68b" opacity=".48"/>
    <path d="M1280 510h160v350h-160Z" fill="#212a2d" opacity=".8"/>
    <path d="M1320 510v350M1280 645h160" stroke="${palette.paper}" stroke-opacity=".2" stroke-width="4"/>
    <g opacity=".75" transform="translate(${150 + shift} 820)">
      <path d="M0 145 110 0l95 145Z" fill="${palette.accent}"/>
      <path d="M38 145V76h92v69M84 76v69" stroke="${palette.paper}" stroke-width="4" opacity=".72"/>
      <rect x="245" y="70" width="178" height="18" rx="9" fill="${palette.paper}" opacity=".45" transform="rotate(-10 245 70)"/>
      <circle cx="500" cy="105" r="48" fill="none" stroke="${palette.accent}" stroke-width="13"/>
    </g>
    <path d="M0 924c280-88 450-44 650 10s470 60 950-66v132H0Z" fill="#060708" opacity=".62"/>
  </g>`
}

function restaurantScene(palette: ScenePalette, variant: number): string {
  const glowX = 320 + (variant % 3) * 230
  return `<g>
    <rect width="1600" height="1000" fill="url(#scene)"/>
    <path d="M0 0h1600v380H0Z" fill="#1b1514" opacity=".55"/>
    <path d="M0 95h1600M0 185h1600M0 275h1600" stroke="${palette.paper}" stroke-opacity=".07" stroke-width="2"/>
    <g opacity=".8"><path d="M${glowX} 0v215" stroke="${palette.paper}" stroke-opacity=".45" stroke-width="4"/><path d="M${glowX - 42} 215h84l-13 45h-58Z" fill="${palette.accent}"/><circle cx="${glowX}" cy="215" r="70" fill="${palette.accent}" opacity=".16" filter="url(#blur)"/></g>
    <path d="M0 500 610 360h990v640H0Z" fill="#332422" opacity=".8"/>
    <path d="M70 515h460v235H70Z" fill="#8a7461" opacity=".48"/>
    <path d="M105 550h390v168H105Z" fill="#b7d2cb" opacity=".28"/>
    <path d="M105 550 300 430l195 120" fill="#0b1719" opacity=".48"/>
    <path d="M760 680c100-110 300-110 400 0v225H760Z" fill="#805d47" opacity=".75"/>
    <ellipse cx="950" cy="735" rx="430" ry="120" fill="#120d0c" opacity=".78"/>
    <ellipse cx="950" cy="708" rx="310" ry="82" fill="#d8c5a7" opacity=".9"/>
    <ellipse cx="950" cy="696" rx="240" ry="52" fill="#7f4e32" opacity=".88"/>
    <path d="M760 688c80-100 150 10 220-40s150 75 260 20" fill="none" stroke="#e4b66e" stroke-width="24" stroke-linecap="round" opacity=".8"/>
    <circle cx="830" cy="670" r="42" fill="#9dbe66" opacity=".9"/><circle cx="1080" cy="676" r="34" fill="#c95e42" opacity=".85"/>
    <path d="M0 900c280-70 490-24 730 16s460 42 870-72v156H0Z" fill="#080909" opacity=".72"/>
    <g opacity=".52"><path d="M1300 480v370M1370 455v395M1440 438v412" stroke="${palette.paper}" stroke-opacity=".18" stroke-width="5"/><path d="M1280 440h205" stroke="${palette.accent}" stroke-width="7"/></g>
  </g>`
}

function dentalScene(palette: ScenePalette, variant: number): string {
  const chairX = 450 + (variant % 2) * 120
  return `<g>
    <rect width="1600" height="1000" fill="url(#scene)"/>
    <rect x="0" y="0" width="1600" height="540" fill="#e8efee" opacity=".2"/>
    <path d="M0 610h1600v390H0Z" fill="#c8d5d3" opacity=".26"/>
    <path d="M90 118h360v330H90Z" fill="#d5e6e3" opacity=".36"/>
    <path d="M120 148h300v270H120Z" fill="#7fa9a9" opacity=".25"/>
    <path d="M135 170h270M135 260h270M135 350h270M225 170v270M315 170v270" stroke="${palette.paper}" stroke-opacity=".35" stroke-width="3"/>
    <path d="M${chairX} 720c-70-150 70-260 210-175l175 112c76 48 40 176-52 185H650c-92 0-152-40-200-122Z" fill="#f4f7f4" opacity=".95"/>
    <path d="M${chairX + 120} 645c-32-95 28-178 119-178s156 82 123 178Z" fill="#e4ece9"/>
    <path d="M${chairX + 162} 505c46-55 100-55 148 0" fill="none" stroke="#b8cbc7" stroke-width="22"/>
    <path d="M${chairX + 235} 815v130M${chairX + 105} 950h290" stroke="#93a8a5" stroke-width="18" stroke-linecap="round"/>
    <path d="M${chairX + 210} 610c95 24 166 90 185 180" fill="none" stroke="${palette.accent}" stroke-width="13" stroke-linecap="round" opacity=".72"/>
    <g transform="translate(1110 190)"><path d="M0 0h260v270H0Z" fill="#e7eeee" opacity=".45"/><path d="M40 40h180v190H40Z" fill="#496d70" opacity=".35"/><path d="M80 0v-74M180 0v-74" stroke="${palette.paper}" stroke-width="8"/><circle cx="80" cy="-90" r="20" fill="${palette.accent}"/><circle cx="180" cy="-90" r="20" fill="${palette.accent}"/></g>
    <path d="M0 900c340-70 620-30 820 20s480 50 780-70v150H0Z" fill="#254344" opacity=".32"/>
  </g>`
}

function beautyScene(palette: ScenePalette, variant: number): string {
  const mirrorX = 220 + (variant % 3) * 260
  return `<g>
    <rect width="1600" height="1000" fill="url(#scene)"/>
    <path d="M0 0h1600v1000H0Z" fill="#3b2831" opacity=".18"/>
    <rect x="${mirrorX}" y="100" width="430" height="555" rx="215" fill="#e5d7d2" opacity=".35"/>
    <rect x="${mirrorX + 28}" y="128" width="374" height="500" rx="187" fill="#b6c6be" opacity=".36"/>
    <path d="M${mirrorX + 46} 470c100-150 250-140 335 0" fill="none" stroke="${palette.paper}" stroke-opacity=".28" stroke-width="26"/>
    <circle cx="${mirrorX + 92}" cy="230" r="16" fill="${palette.accent}"/><circle cx="${mirrorX + 338}" cy="230" r="16" fill="${palette.accent}"/>
    <path d="M80 620h1440v260H80Z" fill="#5a3f42" opacity=".8"/>
    <path d="M120 675h1360" stroke="${palette.paper}" stroke-opacity=".18" stroke-width="3"/>
    <g transform="translate(1040 215)"><path d="M0 0h360v410H0Z" fill="#3c2b2d" opacity=".7"/><path d="M35 42h290v120H35ZM35 208h290v164H35Z" fill="#b88b77" opacity=".5"/><circle cx="105" cy="103" r="34" fill="#d7b09a"/><circle cx="238" cy="103" r="26" fill="#759d89"/><path d="M72 272h226v60H72Z" fill="#e2cdbb" opacity=".65"/></g>
    <path d="M0 925c290-98 520-60 780 0s460 56 820-64v139H0Z" fill="#1b1114" opacity=".7"/>
    <g transform="translate(210 720)"><ellipse cx="110" cy="115" rx="110" ry="30" fill="#1f1518" opacity=".5"/><path d="M24 110V0h172v110" fill="none" stroke="${palette.paper}" stroke-width="12" opacity=".64"/><path d="M50 12h120" stroke="${palette.accent}" stroke-width="10"/></g>
  </g>`
}

function retailScene(palette: ScenePalette, variant: number): string {
  const shelf = 150 + (variant % 3) * 85
  return `<g>
    <rect width="1600" height="1000" fill="url(#scene)"/>
    <path d="M0 0h1600v390H0Z" fill="#d6d0bd" opacity=".28"/>
    <path d="M80 120h1440v720H80Z" fill="#443a31" opacity=".62"/>
    <path d="M130 ${shelf}h1340M130 ${shelf + 198}h1340M130 ${shelf + 396}h1340" stroke="#d6bd91" stroke-opacity=".4" stroke-width="12"/>
    <path d="M160 ${shelf - 165}h190v135H160ZM410 ${shelf - 125}h170v95H410ZM650 ${shelf - 150}h220v120H650ZM945 ${shelf - 112}h160v82H945ZM1190 ${shelf - 170}h230v140H1190Z" fill="#bd9471" opacity=".66"/>
    <path d="M160 ${shelf + 36}h190v123H160ZM410 ${shelf + 22}h170v137H410ZM650 ${shelf + 50}h220v109H650ZM945 ${shelf + 18}h160v141H945ZM1190 ${shelf + 42}h230v117H1190Z" fill="#6d8c7e" opacity=".64"/>
    <path d="M220 0v330M510 0v330M800 0v330M1090 0v330M1380 0v330" stroke="${palette.paper}" stroke-opacity=".16" stroke-width="3"/>
    <path d="M0 900c300-100 620-46 850 16s440 56 750-64v148H0Z" fill="#171313" opacity=".7"/>
    <g transform="translate(650 710)"><path d="M0 180h320L275 0H45Z" fill="#b69667" opacity=".55"/><path d="M80 165 160 0l80 165" fill="none" stroke="${palette.accent}" stroke-width="11"/><circle cx="160" cy="76" r="30" fill="${palette.paper}" opacity=".5"/></g>
  </g>`
}

function serviceScene(palette: ScenePalette, variant: number): string {
  const desk = 470 + (variant % 3) * 100
  return `<g>
    <rect width="1600" height="1000" fill="url(#scene)"/>
    <path d="M0 0h1600v600H0Z" fill="#d8d0c0" opacity=".24"/>
    <path d="M90 110h510v380H90Z" fill="#8babb0" opacity=".3"/>
    <path d="M120 140h450v320H120Z" fill="#23424a" opacity=".48"/>
    <path d="M120 260h450M345 140v320" stroke="${palette.paper}" stroke-opacity=".2" stroke-width="4"/>
    <path d="M0 665h1600v335H0Z" fill="#241d20" opacity=".8"/>
    <path d="M${desk} 610h690l-70 280H${desk - 80}Z" fill="#9b806a" opacity=".82"/>
    <path d="M${desk + 62} 680h500v130h-500Z" fill="#222a2d" opacity=".92"/>
    <rect x="${desk + 178}" y="700" width="215" height="135" rx="8" fill="#a7c1c0" opacity=".5"/>
    <path d="M${desk + 222} 735h127M${desk + 222} 770h180M${desk + 222} 805h150" stroke="${palette.paper}" stroke-opacity=".35" stroke-width="7"/>
    <path d="M${desk + 45} 620v-130M${desk + 580} 620v-130" stroke="#9b806a" stroke-width="16"/>
    <g transform="translate(1160 205)"><rect width="265" height="330" fill="#ded8c6" opacity=".33"/><path d="M44 56h178v12H44ZM44 112h140v12H44ZM44 168h178v12H44ZM44 224h110v12H44Z" fill="${palette.paper}" opacity=".52"/><circle cx="90" cy="282" r="32" fill="${palette.accent}" opacity=".8"/></g>
    <path d="M0 930c340-90 650-54 890 0s420 56 710-60v130H0Z" fill="#101112" opacity=".66"/>
  </g>`
}

export function renderGeneratedScene(industry: string, palette: ScenePalette, variant: number): string {
  if (industry === "construction") return constructionScene(palette, variant)
  if (industry === "restaurant") return restaurantScene(palette, variant)
  if (industry === "dental") return dentalScene(palette, variant)
  if (industry === "beauty_salon") return beautyScene(palette, variant)
  if (industry === "retail") return retailScene(palette, variant)
  return serviceScene(palette, variant)
}
