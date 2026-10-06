// Arena themes, bot rivals, difficulty levels, paints and match-format ideas.
/* ---------- Arena themes ---------- */
const THEMES = [
  {
    id: 'junkyard',
    name: 'Junkyard',
    ground: ['#6a5540', '40,28,16', '150,125,95'],
    wall: 'concrete',
    grip: 1,
    junk: [
      'couch',
      'fridge',
      'washer',
      'bathtub',
      'tv',
      'cart',
      'piano',
      'toilet',
      'vending',
      'mattress',
      'tires',
      'barrel',
      'crate',
      'hay',
      'bumpercar'
    ],
    ramps: 2,
    oil: 2,
    spikes: 1,
    tramp: 0,
    pads: 0
  },
  {
    id: 'backyard',
    name: 'Backyard BBQ',
    ground: ['#4f6a3a', '30,45,20', '120,150,90'],
    wall: 'fence',
    grip: 1,
    junk: [
      'gnome',
      'flamingo',
      'mower',
      'beachball',
      'chair',
      'pumpkin',
      'melon',
      'mailbox',
      'hydrant',
      'duck',
      'pinata',
      'hay',
      'pin',
      'snowman'
    ],
    ramps: 1,
    oil: 0,
    spikes: 0,
    tramp: 2,
    pads: 0
  },
  {
    id: 'market',
    name: 'Supermarket',
    ground: ['#8b8f93', '70,74,78', '190,194,198'],
    wall: 'shelf',
    grip: 1,
    junk: [
      'cart',
      'cart',
      'vending',
      'donut',
      'melon',
      'pumpkin',
      'pinata',
      'chicken',
      'tv',
      'arcade',
      'trophy',
      'duck',
      'cone'
    ],
    ramps: 0,
    oil: 3,
    spikes: 0,
    tramp: 0,
    pads: 2
  },
  {
    id: 'construction',
    name: 'Construction Site',
    ground: ['#9a7d4f', '70,52,25', '190,165,120'],
    wall: 'concrete',
    grip: 1,
    junk: ['cone', 'cone', 'barrier', 'crate', 'barrel', 'potty', 'hydrant', 'tires', 'booth', 'mattress'],
    ramps: 4,
    oil: 1,
    spikes: 2,
    tramp: 0,
    pads: 1
  },
  {
    id: 'ice',
    name: 'Ice Rink',
    ground: ['#cfe3ee', '140,170,190', '245,250,255'],
    wall: 'boards',
    grip: 0.45,
    junk: ['snowman', 'snowman', 'cone', 'pin', 'beachball', 'duck', 'trophy', 'flamingo', 'chicken', 'hay'],
    ramps: 1,
    oil: 0,
    spikes: 0,
    tramp: 1,
    pads: 2
  },
  {
    id: 'carpark',
    name: 'Rooftop Car Park',
    ground: ['#5d6166', '40,42,46', '140,146,152'],
    wall: 'concrete',
    grip: 1,
    junk: [
      'cart',
      'cart',
      'cone',
      'cone',
      'cone',
      'barrier',
      'tires',
      'vending',
      'booth',
      'hydrant',
      'bumpercar',
      'mattress'
    ],
    ramps: 3,
    oil: 2,
    spikes: 0,
    tramp: 0,
    pads: 2
  },
  {
    id: 'beach',
    name: 'Boardwalk Beach',
    ground: ['#d9c38a', '150,120,70', '250,235,190'],
    wall: 'fence',
    grip: 0.8,
    junk: [
      'beachball',
      'beachball',
      'chair',
      'chair',
      'flamingo',
      'melon',
      'duck',
      'pinata',
      'cactus',
      'hay',
      'trophy',
      'cone'
    ],
    ramps: 1,
    oil: 0,
    spikes: 0,
    tramp: 2,
    pads: 0
  }
];
/* ---------- Bot rivals ---------- */
const BOTS = [
  {
    name: 'Rusty Ramirez',
    style: 'rammer',
    likes: ['melee', 'pinball', 'flip'],
    paint: '#d6463e',
    say: ['Brakes are for quitters!', 'I only know one direction.', 'Ramming speed!']
  },
  {
    name: 'Gunny McBolt',
    style: 'gunner',
    likes: ['gun', 'def'],
    paint: '#4ea1ff',
    say: ['Lock and load.', 'Hold still, this will only take a minute.', 'Bullets are cheaper than armor.']
  },
  {
    name: 'Big Boom Betty',
    style: 'artillery',
    likes: ['expl', 'energy'],
    paint: '#c58bff',
    say: ['Ka-BOOM, sweetie.', 'Duck and cover, darling!', 'I bake with dynamite.']
  },
  {
    name: 'Scorch',
    style: 'brawler',
    likes: ['fire', 'slip'],
    paint: '#ff8a3a',
    say: ['Feel the heat!', 'Smells like burning tyres.', 'Everything is flammable if you try.']
  },
  {
    name: 'Magpie',
    style: 'gunner',
    likes: ['scrap', 'hook', 'econ'],
    paint: '#5cc38f',
    say: ['Ooh, shiny parts.', 'Your bumper will look great on me.', 'Finders keepers!']
  },
  {
    name: 'Professor Volt',
    style: 'gunner',
    likes: ['energy', 'cold'],
    paint: '#7fe0ff',
    say: ['Fascinating. Prepare to be electrified.', 'The science is settled: you lose.', 'Ohm my, you look nervous.']
  },
  {
    name: 'Granny Gearbox',
    style: 'rammer',
    likes: ['def', 'melee', 'hook'],
    paint: '#ff8fc7',
    say: ['Back in my day we built cars out of tanks.', 'Mind your manners, dearie.', 'I knit armor plating.']
  },
  {
    name: 'DJ Dynamo',
    style: 'artillery',
    likes: ['air', 'expl', 'pinball'],
    paint: '#f2b705',
    say: ['Drop the bass! And the bombs!', 'This one goes out to your cockpit.', 'Turn it up!']
  }
];
const DIFF = [
  { name: 'Easy', jitter: 110, lead: 0.2, react: 0.6, bonus: -40, build: 0.55 },
  { name: 'Normal', jitter: 50, lead: 0.65, react: 0.28, bonus: -10, build: 0.8 },
  { name: 'Hard', jitter: 14, lead: 1, react: 0.1, bonus: 40, build: 1 }
];
const PAINTS = ['#f2b705', '#e2504a', '#4ea1ff', '#5cc38f', '#c58bff', '#ff8fc7', '#ece8df', '#ff8a3a'];
let ROUNDS = 10;
const ROUND_CHOICES = [5, 10, 25];
const setRounds = n => (ROUNDS = ROUND_CHOICES.includes(+n) ? +n : 10);
const MATCH_IDEAS = [
  [
    'Balanced rounds',
    'One point per round and two points in the finale. Early wins count while the finale still offers a comeback.'
  ],
  [
    'Scrap lives',
    'Both start with 20 lives; losing costs 2 + round number. Ends when someone hits zero, so close games run long and blowouts end early.'
  ],
  ['Hill finale', 'Balanced scoring, with King of the Hill guaranteed in the double-point finale.'],
  ['Bounty', 'Defeating the leader awards 1–4 points based on their winning streak, plus bonus scrap.'],
  [
    'Draft duel',
    'Rounds alternate between brawls and objective modes (push the piano into their goal, steal the golden duck).'
  ]
];
