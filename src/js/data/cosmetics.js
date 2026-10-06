// Garage Style: cosmetics are earned by playing (Scrap Cred levels) and by achievements. Nothing is bought.
const STYLE_SLOTS = [
  ['livery', 'Livery'],
  ['trail', 'Trail'],
  ['wreck', 'Wreck effect'],
  ['title', 'Title']
];
const COSMETICS = {
  livery: [
    { id: 'factory', name: 'Factory', desc: 'Plain paint, straight off the scrap heap.' },
    { id: 'stripes', name: 'Racing Stripes', desc: 'Two stripes down the middle.', unlock: { lvl: 2 } },
    { id: 'hazard', name: 'Hazard Tape', desc: 'Warning stripes around the edges.', unlock: { lvl: 5 } },
    { id: 'camo', name: 'Scrapyard Camo', desc: 'Blotches in your paint colour.', unlock: { lvl: 7 } },
    { id: 'flames', name: 'Hot Rod Flames', desc: 'Flames licking back from the nose.', unlock: { lvl: 9 } },
    { id: 'tiger', name: 'Tiger Stripes', desc: 'Jagged stripes across the whole car.', unlock: { lvl: 12 } },
    { id: 'checker', name: 'Chequered', desc: 'Finish-line squares.', unlock: { ach: 'match_win' } },
    { id: 'chrome', name: 'Chrome', desc: 'Mirror-polished plating.', unlock: { ach: 'flawless' } },
    { id: 'gold', name: 'Solid Gold', desc: 'For people who beat Hard.', unlock: { ach: 'hard_win' } },
    { id: 'holo', name: 'Hologram', desc: 'Shifts colour as you move.', unlock: { ach: 'collector' } },
    { id: 'rust', name: 'Barn Find', desc: 'Rust, dents and peeling paint.', unlock: { lvl: 16 } },
    {
      id: 'neon',
      name: 'Neon Nights',
      desc: 'Glowing edges that pulse in the dark.',
      unlock: { ach: 'night' }
    },
    { id: 'carbon', name: 'Carbon Fibre', desc: 'Woven carbon with a glossy sheen.', unlock: { lvl: 3 } },
    { id: 'arctic', name: 'Arctic Camo', desc: 'Pixel snow camo in white and steel.', unlock: { lvl: 4 } },
    { id: 'circuit', name: 'Circuit Board', desc: 'Green board, copper traces, blinking nodes.', unlock: { lvl: 6 } },
    {
      id: 'racing',
      name: 'Race Number',
      desc: 'One fat stripe and your number on the cockpit.',
      unlock: { ach: 'first_win' }
    },
    { id: 'graffiti', name: 'Street Tag', desc: 'Spray paint splats and drips.', unlock: { lvl: 10 } },
    { id: 'lava', name: 'Molten Core', desc: 'Black crust with glowing cracks that breathe.', unlock: { lvl: 13 } },
    { id: 'dazzle', name: 'Dazzle', desc: 'Zig-zag ship camo. Confuses the eye, not the bot.', unlock: { lvl: 15 } },
    { id: 'galaxy', name: 'Nebula', desc: 'Deep space with twinkling stars.', unlock: { lvl: 18 } },
    {
      id: 'jackpot',
      name: 'Jackpot Gold',
      desc: 'Diamond-plate gold with glints. Crate jackpot only.',
      unlock: { ach: 'jackpot' }
    }
  ],
  trail: [
    { id: 'none', name: 'None', desc: 'No trail.' },
    { id: 'sparks', name: 'Sparks', desc: 'Sparks fly when you go fast.', unlock: { lvl: 3 } },
    { id: 'smoke', name: 'Burnout', desc: 'Thick tyre smoke.', unlock: { lvl: 6 } },
    { id: 'bubbles', name: 'Bubbles', desc: 'Soap bubbles. Very intimidating.', unlock: { lvl: 8 } },
    { id: 'rainbow', name: 'Rainbow', desc: 'A rainbow ribbon.', unlock: { lvl: 14 } },
    { id: 'ember', name: 'Embers', desc: 'Glowing embers.', unlock: { ach: 'pyro' } },
    { id: 'notes', name: 'Music', desc: 'Musical notes drift behind you.', unlock: { ach: 'piano' } },
    { id: 'zap', name: 'Static', desc: 'Crackling electricity.', unlock: { ach: 'powered' } },
    { id: 'hearts', name: 'Love Bug', desc: 'Little hearts. Your rival will not feel loved.', unlock: { lvl: 5 } },
    { id: 'pixels', name: '8-bit', desc: 'Retro pixels in your paint colour.', unlock: { lvl: 11 } },
    { id: 'comet', name: 'Comet', desc: 'A long glowing tail.', unlock: { lvl: 17 } },
    { id: 'coins', name: 'Money Trail', desc: 'You drop coins. They are not real.', unlock: { ach: 'jackpot' } }
  ],
  wreck: [
    { id: 'classic', name: 'Classic', desc: 'Fire and smoke.' },
    { id: 'confetti', name: 'Confetti', desc: 'Go out like a party.', unlock: { lvl: 4 } },
    { id: 'glitter', name: 'Gold Glitter', desc: 'A shower of gold flakes.', unlock: { lvl: 10 } },
    { id: 'pixels', name: '8-bit', desc: 'Your car breaks into pixels.', unlock: { ach: 'boom' } },
    { id: 'ducks', name: 'Rubber Ducks', desc: 'So. Many. Ducks.', unlock: { ach: 'duck' } },
    { id: 'notes', name: 'Grand Finale', desc: 'A burst of music notes.', unlock: { ach: 'piano' } }
  ],
  title: [
    { id: 'rookie', name: 'Rookie', desc: 'Everybody starts somewhere.' },
    { id: 'scrapper', name: 'Scrapper', desc: 'Won a round.', unlock: { ach: 'first_win' } },
    { id: 'grease', name: 'Grease Monkey', desc: 'Reached Scrap Cred level 11.', unlock: { lvl: 11 } },
    { id: 'duckthief', name: 'Duck Thief', desc: 'Won a Golden Duck Heist.', unlock: { ach: 'duck' } },
    { id: 'pianomover', name: 'Piano Mover', desc: 'Won Piano Push.', unlock: { ach: 'piano' } },
    { id: 'hillking', name: 'Hill King', desc: 'Won King of the Hill.', unlock: { ach: 'hill' } },
    {
      id: 'untouchable',
      name: 'Untouchable',
      desc: 'Won a round with barely a scratch.',
      unlock: { ach: 'flawless' }
    },
    { id: 'pyro', name: 'Pyromaniac', desc: 'Dealt 400 fire damage in a round.', unlock: { ach: 'pyro' } },
    {
      id: 'demo',
      name: 'Demolition Expert',
      desc: 'Dealt 600 explosive damage in a round.',
      unlock: { ach: 'boom' }
    },
    {
      id: 'comeback',
      name: 'Comeback Kid',
      desc: 'Won a match after trailing by 10.',
      unlock: { ach: 'comeback' }
    },
    { id: 'champion', name: 'Champion', desc: 'Won an online match.', unlock: { ach: 'mp_win' } },
    { id: 'nightowl', name: 'Night Owl', desc: 'Won a Night Shift round.', unlock: { ach: 'night' } },
    { id: 'sumo', name: 'Sumo Champ', desc: 'Won a Sumo Ring round.', unlock: { ach: 'sumo' } },
    {
      id: 'juiced',
      name: 'Juiced',
      desc: 'Grabbed three power-ups in one round.',
      unlock: { ach: 'powered' }
    },
    { id: 'legend', name: 'Scrap Legend', desc: 'Reached Scrap Cred level 20.', unlock: { lvl: 20 } }
  ]
};
const ACHIEVEMENTS = {
  boss_slayer: { name: 'Boss Slayer', desc: 'Beat a boss in the Scrap Gauntlet.' },
  wave10: { name: 'Marathon', desc: 'Reach wave 10 in the Scrap Gauntlet.' },
  wave25: { name: 'Unkillable', desc: 'Reach wave 25 in the Scrap Gauntlet.' },
  first_win: { name: 'First Blood', desc: 'Win a round.' },
  match_win: { name: 'Winner Winner', desc: 'Win a match.' },
  hard_win: { name: 'Hardened', desc: 'Win a match against a Hard bot.' },
  mp_win: { name: 'Champion', desc: 'Win an online match.' },
  comeback: { name: 'Comeback Kid', desc: 'Win a match after trailing by 10 or more points.' },
  flawless: { name: 'Flawless', desc: 'Win a round and keep 90% of your car.' },
  duck: { name: 'Duck Thief', desc: 'Win a Golden Duck Heist.' },
  piano: { name: 'Piano Mover', desc: 'Win a Piano Push.' },
  hill: { name: 'Hill King', desc: 'Win King of the Hill.' },
  pyro: { name: 'Pyromaniac', desc: 'Deal 400 fire damage in one round.' },
  boom: { name: 'Demolition Expert', desc: 'Deal 600 explosive damage in one round.' },
  collector: { name: 'Collector', desc: 'Find 50 different modules in one match.' },
  night: { name: 'Night Owl', desc: 'Win a Night Shift round.' },
  sumo: { name: 'Sumo Champ', desc: 'Win a Sumo Ring round.' },
  powered: { name: 'Juiced', desc: 'Grab three power-ups in one round.' },
  jackpot: { name: 'Jackpot', desc: 'Hit the 1 in 100 jackpot in a Scrap Crate.' }
};
const XP = { round: 25, roundWin: 25, specialWin: 15, match: 50, matchWin: 100 };
const xpForLevel = lvl => 100 + 50 * (lvl - 1); // XP needed to go from lvl to lvl + 1
const DEFAULT_STYLE = { livery: 'factory', trail: 'none', wreck: 'classic', title: 'rookie', badge: 'shield.bolt.0' };
