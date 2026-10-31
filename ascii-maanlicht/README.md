# Maanlicht

Een ASCII-avontuur in één bestand. Elk toestel is een speler met een vaste ID. Je start je eigen wereld (jouw toestel is dan de host) of je doet mee met de wereldcode van een ander. Dag, nacht en weer lopen gelijk met de echte tijd.

## Starten

- **Windows:** `dist/Maanlicht.exe` (portable, geen installatie). Bouwen: `npm install` en dan `npm run dist:win`.
- **Browser:** `npm run build` en open daarna `app/index.html`.

## Hoe het eruitziet

De wereld wordt in lagen opgebouwd en per teken gerenderd (WebGL2):

1. **Wereldkaart:** een procedureel eiland van 320×320 met rivieren (steilste afdaling), terrassen met kliffen, dorpen, ruïnes, akkers en wegen (A*, met bruggen over water).
2. **2.5D-raymarch:** rotsen, bomen (eik en den), huizen en muren hebben echte hoogte. Ze werpen schaduw naar de zon of de maan en worden doorzichtig waar ze een speler afdekken.
3. **Belichting:** dag-nachtcyclus op de echte klok, wolkenschaduw, kampvuren, lantaarns, verlichte ramen, vuurvliegjes en lichtgevende paddenstoelen.
4. **Figuren:** spelers, dorpelingen, skeletten, slijmers, dwaallichten en de Grafwachter, met een rig van capsules: lopen, ademen, een wapperende cape en zwaaiende wapens.
5. **Tekenkeuze:** per materiaal een eigen tekenset (gras buigt mee met de wind, dakpannen, stenen, water, vuur, rook).
6. **Compositie:** tekens, bloom van lichtbronnen, grondmist, regen, bliksem en vignet.

`T` schakelt naar het ruwe beeld zonder tekens.

## Besturing

| | Speler 1 | Speler 2 (zelfde toetsenbord) | Controller |
|---|---|---|---|
| Lopen | WASD (Shift sprint) | pijltjes (rechter Shift) | linker stick |
| Aanval | spatie / F | `.` / Num1 | A |
| Spreuk | Q | `,` / Num2 | X |
| Actie (kist, praten) | E | `/` / Num3 | B |
| Drankje | H | `;` / Num4 | LB |
| Tas | I / Tab | P / Num+ | Y |

`M` kaart · `−` / `=` tekengrootte · `F11` volledig scherm (exe)

## Online

Online spelen gaat via PeerJS (WebRTC, peer-to-peer). De host bepaalt vijanden, buit, kisten en de baas. Deelnemers sturen hun eigen speler en hun acties door. Je personage wordt per toestel bewaard en neem je mee naar elke wereld.
