/** Original layered cover illustration. Inline SVG lets the ambient motion stay lightweight. */
export function homesteadArt(id: string) {
  return `<svg class="homestead-art" viewBox="0 0 1000 820" fill="none" aria-hidden="true">
<defs>
  <linearGradient id="${id}-sky" x2="0" y2="1"><stop stop-color="#537d7b"/><stop offset=".58" stop-color="#d1cba6"/><stop offset="1" stop-color="#f0c293"/></linearGradient>
  <linearGradient id="${id}-land" x2=".4" y2="1"><stop stop-color="#809980"/><stop offset="1" stop-color="#324f46"/></linearGradient>
  <linearGradient id="${id}-roof" x2="1" y2="1"><stop stop-color="#db9874"/><stop offset="1" stop-color="#8b5144"/></linearGradient>
  <linearGradient id="${id}-wall" x2="1" y2="1"><stop stop-color="#f6e2b9"/><stop offset="1" stop-color="#b7ab83"/></linearGradient>
  <radialGradient id="${id}-light"><stop stop-color="#ffe5a4" stop-opacity=".55"/><stop offset="1" stop-color="#ffe5a4" stop-opacity="0"/></radialGradient>
  <filter id="${id}-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="15" flood-color="#112e29" flood-opacity=".25"/></filter>
  <pattern id="${id}-grain" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".65" fill="#fff" opacity=".12"/><circle cx="7" cy="6" r=".6" fill="#152e29" opacity=".12"/></pattern>
  <g id="${id}-tree"><path d="m0 0 4-91" stroke="#405548" stroke-width="10" stroke-linecap="round"/><path d="M-39-53Q-63-74-39-92Q-53-113-28-125Q-27-155-4-158Q20-159 23-133Q53-126 44-100Q65-68 34-53Q11-35-8-47Q-25-38-39-53" fill="#456d5d"/><path d="M-35-105Q-43-125-21-129Q-16-153 2-148Q25-143 19-124Q40-114 31-96Q4-77-22-92" fill="#688977"/></g>
</defs>
<rect width="1000" height="820" rx="36" fill="url(#${id}-sky)"/>
<circle cx="720" cy="169" r="78" fill="#ffdf9e" opacity=".8"/>
<circle cx="720" cy="169" r="112" stroke="#ffefd0" opacity=".16"/>
<g class="scene-clouds" fill="#f4e9cb" opacity=".48"><path d="M112 163h230q-24-24-64-19-15-29-51-12-42-23-61 17-38-5-54 14"/><path d="M600 84h225q-19-18-55-15-28-32-60-9-35-15-52 12-41-4-58 12"/></g>
<path d="M0 350 132 214 260 336 400 199 558 328 687 254 828 348 1000 218V820H0Z" fill="#78968b"/>
<path d="m0 355 131-96 155 132 142-115 151 120 163-96 258 92v428H0Z" fill="#637e70"/>
<path d="M0 443Q210 309 424 407T1000 368V820H0Z" fill="url(#${id}-land)"/>
<path d="M712 371q-102 47-40 92t-126 92Q309 611 363 820h189q-69-119 71-189t78-133q-79-62 58-126" fill="#99c0b6"/>
<path d="M711 383q-79 40-20 85t-117 100q-197 61-167 231" stroke="#d6dfc2" stroke-width="3" opacity=".65"/>
<path d="M0 629Q127 538 315 568t148-109q-12-49 112-75" stroke="#c6bc92" stroke-width="32"/>
<path d="M0 629Q127 538 315 568t148-109q-12-49 112-75" stroke="#e4d6af" stroke-width="19"/>
<g opacity=".8"><use href="#${id}-tree" transform="translate(121 454) scale(.75)"/><use href="#${id}-tree" transform="translate(904 440) scale(.8)"/><use href="#${id}-tree" transform="translate(827 399) scale(.54)"/><use href="#${id}-tree" transform="translate(257 426) scale(.44)"/></g>
<!-- The warm safehouse: raised foundation, masonry, roof seams and an open door. -->
<g filter="url(#${id}-shadow)">
 <path d="m246 489 194-60 193 68-187 77Z" fill="#42564a"/>
 <path d="M294 340 443 282 566 354v144l-125 44-147-55Z" fill="url(#${id}-wall)"/>
 <path d="m441 341 125 13v144l-125 44Z" fill="#bdba96"/>
 <path d="m274 345 90-109 118-28 108 146-151 18-99-65Z" fill="url(#${id}-roof)"/>
 <path d="m274 345 66-38 99 65 151-18" stroke="#f2b28a" stroke-width="9" stroke-linejoin="round"/>
 <path d="m364 236 75 136m-42-143 74 140m-41-147 75 143m-42-149 75 145" stroke="#9f6150" stroke-width="4"/>
 <path d="m475 257 1-65 28-9 23 11v79" fill="#c5b99a"/><path d="m472 191 32-10 27 11-31 11Z" fill="#e4d6b4"/>
 <path class="scene-smoke" d="M500 170q-29-26-4-46t-13-47" stroke="#f1dfbd" stroke-width="16" stroke-linecap="round" opacity=".24"/>
 <path d="m304 364 133 45m9 2 108-31M306 467l128 45m16 2 105-36" stroke="#927d5d" stroke-width="5"/>
 <path d="M320 381v58l38 14v-58Z" fill="#304b45" stroke="#eeddba" stroke-width="7"/>
 <path d="m337 388 1 58m-17-36 37 13" stroke="#e5c186" stroke-width="4"/>
 <path d="m469 403 1 51 37-13v-51Z" fill="#ffd59a" stroke="#77795f" stroke-width="7"/>
 <path d="m488 397 1 49m-18-20 33-13" stroke="#b7a47b" stroke-width="3"/>
 <path d="M381 425q0-22 19-15l19 7v87l-38-14Z" fill="#293f35"/>
 <path d="m380 415 25 14v76l-25-16Z" fill="#837d57" stroke="#e4cf9a" stroke-width="3"/>
 <circle cx="397" cy="466" r="3" fill="#f4d487"/>
 <path d="m370 493 55 17 12 11-63-18-9 6 65 18-15 6-64-22Z" fill="#c3b38c"/>
 <path d="m533 414 9-4v45l-9 4Z" fill="#6d725a"/>
 <circle class="scene-lamp" cx="452" cy="439" r="70" fill="url(#${id}-light)"/>
 <path d="M445 415h15v23h-15z" fill="#ffdca0" stroke="#6d6550" stroke-width="3"/><path d="m440 415 12-10 12 10Z" fill="#535c49"/>
 <g fill="#596b54"><ellipse cx="371" cy="353" rx="12" ry="9" transform="rotate(20 371 353)"/><circle cx="353" cy="336" r="5"/><circle cx="366" cy="330" r="5"/><circle cx="380" cy="334" r="5"/><circle cx="391" cy="343" r="5"/></g>
</g>
<!-- Bridge and a few deliberate foreground details. -->
<g transform="translate(558 551) rotate(-17)" filter="url(#${id}-shadow)"><path d="M0 0h161v53H0z" fill="#a58e65" stroke="#665f43" stroke-width="5"/><path d="M13 2v49m18-49v49m18-49v49m18-49v49m18-49v49m18-49v49m18-49v49m18-49v49" stroke="#e2c49a" stroke-width="3"/><path d="M0-15v77M161-15v77M0-5h161M0 60h161" stroke="#6d6247" stroke-width="8" stroke-linecap="round"/></g>
<path d="M0 731Q132 639 287 719q110 49 269 18 246-98 444-4v87H0Z" fill="#2c4d40"/>
<use href="#${id}-tree" transform="translate(853 687) scale(1.35)"/>
<use href="#${id}-tree" transform="translate(79 723) scale(1.2)"/>
<g stroke="#a4b28a" stroke-width="5" stroke-linecap="round"><path d="m766 754 2-29m-3 20-14-12m17 3 14-12M208 741l-8-32m7 22 10-18"/></g>
<g fill="#e9c58c"><circle cx="750" cy="733" r="5"/><circle cx="784" cy="724" r="4"/><circle cx="200" cy="709" r="4"/></g>
<!-- A travelling cat, seen from behind, looking toward home. -->
<g transform="translate(289 647)" filter="url(#${id}-shadow)">
 <path d="M-25 49q-24 53 25 60t35-53" fill="#d8caa6"/>
 <path d="M27 91q71 40 66-14" stroke="#c19a6c" stroke-width="17" stroke-linecap="round"/>
 <path d="m-36 15-3-50 33 20 29-2 25-26 5 54q20 57-39 64-57-1-50-60" fill="#eddfbc"/>
 <path d="m-36 15-3-50 33 20q-9 56-30 30" fill="#c78e58"/><path d="m23-17 25-26 5 54q-34 18-30-28" fill="#765441"/>
 <path d="m-32-19 2 23 16-15m49-6 10-11 1 23" stroke="#d7a18b" stroke-width="5" stroke-linecap="round"/>
 <rect x="-31" y="60" width="64" height="53" rx="17" fill="#657b56" stroke="#293f34" stroke-width="3"/>
 <path d="M-23 63q24-16 48 0v16h-48Z" fill="#8e9b6d"/><path d="M-4 68h12v18H-4z" fill="#d6b57d"/>
 <path d="M-27 110h18m27 0h17" stroke="#eee3c9" stroke-width="12" stroke-linecap="round"/>
</g>
<rect width="1000" height="820" rx="36" fill="url(#${id}-grain)" style="pointer-events:none"/>
<g class="scene-fireflies" fill="#ffe4a1"><circle cx="186" cy="530" r="2.5"/><circle cx="747" cy="605" r="3"/><circle cx="394" cy="601" r="2"/><circle cx="586" cy="707" r="2.5"/></g>
</svg>`;
}
