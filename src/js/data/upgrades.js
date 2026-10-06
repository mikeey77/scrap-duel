// Tuning cards: drafted tradeoffs that change one module type.
/* ---------- Tuning cards (tradeoffs) ---------- */
const TUNE = [
  ['longnozzle', 'Long Nozzle', 'flamer', 'Flames reach 50% further', 'Flame damage −20%'],
  ['napalmmix', 'Sticky Napalm', 'flamer', 'Things you ignite burn twice as long', 'Flames reach 20% shorter'],
  ['burntrail', 'Burning Trail', 'flamer', 'Driving fast leaves burning ground behind you', 'Flame damage −10%'],
  ['apround', 'AP Rounds', 'mg', 'Machine guns ignore armor resistance', 'Fire rate −25%'],
  ['drum', 'Drum Magazine', 'mg', 'Machine guns fire 50% faster', 'Spread +60%'],
  ['bigbore', 'Big Bore', 'cannon', 'Cannon damage +50%', 'Recoil doubled'],
  ['dampers', 'Recoil Dampers', 'cannon', 'Cannon recoil −80%', 'Cannon damage −15%'],
  ['choke', 'Choke Barrel', 'scatter', 'Spread −45%, range +30%', 'Five pellets instead of seven'],
  ['longvolley', 'Long Volley', 'rocket', 'Six rockets per volley', 'Reload +2 s'],
  ['heavyshell', 'Heavy Shells', 'mortar', 'Mortar blast radius +40%', 'Shells fly 40% slower'],
  ['overcharge', 'Overcharge', 'railgun', 'Railgun damage +60%', 'Charge time +0.6 s'],
  ['widearc', 'Wide Arc', 'arc', 'Lightning jumps two more times', 'Range −20%'],
  ['winch', 'Winch Motor', 'harpoon', 'Reel in twice as hard', 'Harpoon range −25%'],
  ['diamond', 'Diamond Teeth', 'saw', 'Saw damage +40%', 'Saws take 30% more damage'],
  ['tungsten', 'Tungsten Tip', 'lance', 'Lance tip damage +50%', 'Each lance weighs 2 t more'],
  ['heavyball', 'Heavy Ball', 'ball', 'Wrecking ball damage +60%', 'Pulls your car around harder'],
  ['springsteel', 'Spring Steel', 'flipper', 'Flips launch 60% higher', 'Flipper cooldown +30%'],
  ['pneumatic', 'Pneumatic Line', 'piston', 'Piston cooldown −40%', 'Recoil +50%'],
  ['afterburner', 'Afterburner', 'booster', 'Booster bursts last twice as long', 'Off-center boosters spin you harder'],
  ['moonboots', 'Moon Boots', 'jump', 'Jumps go 50% higher', 'Landings hit harder'],
  ['mudtires', 'Mud Tires', 'wheel', 'Standard wheels +30% grip', 'Top speed −10%'],
  ['capshield', 'Capacitor Shield', 'shield', 'Shield soaks twice as much', 'Recharge +3 s'],
  ['thicksmoke', 'Thick Smoke', 'smoke', 'Smoke lasts twice as long', 'Countermeasure cooldown +5 s'],
  ['cryo', 'Deep Freeze', 'freeze', 'Frozen things stay frozen twice as long', 'Freeze beam range −25%'],
  ['hive', 'Bigger Hive', 'drone', 'Three drones per bay', 'Drones have half the health'],
  ['pressure', 'High Pressure', 'hydro', 'Water pushes 60% harder', 'Range −20%'],
  ['ricochet', 'Rubber Compound', 'tirel', 'Tyres bounce five times', 'Tyre damage −25%'],
  ['minispool', 'Pre-Spool', 'minigun', 'Miniguns start fully spun up', 'Spread +40%']
].map(([id, name, mod, pro, con]) => ({ id, name, mod, pro, con }));
const TUNEMAP = Object.fromEntries(TUNE.map(t => [t.id, t]));
