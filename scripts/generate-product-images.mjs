import { mkdir, writeFile } from "node:fs/promises";

const outDir = new URL("../public/images/products/", import.meta.url);

const products = [
  ["earbuds", "무선 이어폰", "electronics", "#D946EF", "#22D3EE", "audio"],
  ["keyboard", "기계식 키보드", "electronics", "#A21CAF", "#22D3EE", "keys"],
  ["monitor", "4K 모니터", "electronics", "#7E22CE", "#FACC15", "display"],
  ["mouse", "게이밍 마우스", "electronics", "#C026D3", "#3B82F6", "mouse"],
  ["hub", "USB-C 허브", "electronics", "#22D3EE", "#D946EF", "hub"],
  ["shoes", "Cloud Run", "fashion", "#D946EF", "#FACC15", "run"],
  ["backpack", "방수 백팩", "fashion", "#BE185D", "#22D3EE", "pack"],
  ["hoodie", "후드티", "fashion", "#EC4899", "#FACC15", "wear"],
  ["tumbler", "텀블러", "kitchen", "#22D3EE", "#22C55E", "cup"],
  ["press", "프렌치 프레스", "kitchen", "#14B8A6", "#FACC15", "brew"],
  ["bulb", "스마트 전구", "home", "#FACC15", "#D946EF", "light"],
  ["robot-vacuum", "로봇 청소기", "home", "#F59E0B", "#22D3EE", "clean"],
];

function svg([slug, title, category, c1, c2, label]) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="640" viewBox="0 0 900 640" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="68%" cy="26%" r="48%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity=".48"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="22" stdDeviation="24" flood-color="#001629" flood-opacity=".26"/>
    </filter>
  </defs>
  <rect width="900" height="640" fill="url(#bg)"/>
  <rect width="900" height="640" fill="url(#glow)"/>
  <g opacity=".16" fill="none" stroke="#fff" stroke-width="2">
    <path d="M90 112h720M90 528h720M130 70v500M770 70v500"/>
    <circle cx="742" cy="112" r="62"/>
    <circle cx="145" cy="495" r="96"/>
  </g>
  <g filter="url(#shadow)">
    <rect x="238" y="176" width="424" height="288" rx="34" fill="#fff" opacity=".94"/>
    <rect x="276" y="216" width="348" height="134" rx="20" fill="#FAFAFA"/>
    <path d="M318 392h264" stroke="${c1}" stroke-width="18" stroke-linecap="round"/>
    <path d="M350 264h200" stroke="${c2}" stroke-width="22" stroke-linecap="round"/>
    <path d="M350 306h132" stroke="${c1}" stroke-width="16" stroke-linecap="round" opacity=".72"/>
  </g>
  <text x="64" y="84" fill="#fff" font-family="Arial, sans-serif" font-size="28" font-weight="700" opacity=".86">${category}</text>
  <text x="64" y="552" fill="#fff" font-family="Arial, sans-serif" font-size="56" font-weight="900">${title}</text>
  <text x="66" y="596" fill="#ffffff" font-family="Arial, sans-serif" font-size="24" font-weight="700" opacity=".88">market cloud ${label}</text>
</svg>`;
}

await mkdir(outDir, { recursive: true });
await Promise.all(products.map((product) => writeFile(new URL(`${product[0]}.svg`, outDir), svg(product))));
console.log(`generated ${products.length} product images`);
