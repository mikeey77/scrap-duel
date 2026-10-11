// What the commentators say. Dash Danvers does the shouting, Doc Gasket the dry remarks.
// Every line is fixed text (no names) because each one is also a recorded voice clip:
// tools/make-voices.mjs turns this file into assets/voice/*.ogg. Edit a line, run the tool, and the clip follows.
// A call is one line or a short exchange: [[caster, text], [caster, text]].
const CASTERS = {
  dash: { name: 'Dash Danvers', col: '#ffb423' },
  doc: { name: 'Doc Gasket', col: '#5be7ff' }
};
const CALLS = {
  start: [
    [['dash', 'Two engineering disasters enter. One insurance claim leaves!']],
    [['dash', 'Lights, rust, action!']],
    [
      ['dash', "Doc, who's your money on?"],
      ['doc', "Whoever doesn't fall apart first. That's science."]
    ],
    [['doc', 'Every bolt out there was once a perfectly good toaster.']],
    [
      ['dash', 'Welcome back to the junkyard!'],
      ['doc', 'Mind the oil. And the saws. And, frankly, everything.']
    ],
    [['dash', 'Somebody call the scrap man, because one of these is going home in pieces!']],
    [
      ['doc', 'I have inspected both vehicles.'],
      ['dash', 'And?'],
      ['doc', 'I would not let either of them near my nan.']
    ],
    [['dash', 'The engines are roaring, the paint is peeling, and I have not slept in days!']],
    [['doc', 'Both drivers have signed the waiver. Twice. The second time in crayon.']],
    [['dash', 'Ladies and gentlemen, it is time to make some very loud mistakes!']],
    [
      ['dash', 'What a crowd tonight, Doc!'],
      ['doc', 'Mostly here for the explosions. Same as me.']
    ],
    [['doc', 'Today, two machines will find out what "structural integrity" means. The hard way.']]
  ],
  firstblood: [
    [['dash', 'First blood! Somebody owes somebody a new bumper!']],
    [['doc', 'And the first dent of the day. It will not be the last.']],
    [['dash', 'Contact! We have contact! And a lot of sparks!']],
    [['doc', 'There it is. The paint job will never recover.']],
    [['dash', "And we're off! That's the first scratch, and it's a big one!"]]
  ],
  bighit: [
    [['dash', 'OH! I felt that one in my teeth!']],
    [['doc', 'That hit had paperwork attached.']],
    [['dash', 'KA-CHUNK! Somebody is going to need a bigger toolbox!']],
    [['dash', 'WHAM! That is not a love tap, folks!']],
    [['doc', 'I believe the technical term for that is "ouch".']],
    [['dash', 'Did you hear that noise? Cars are not supposed to make that noise!']],
    [['doc', 'That one will show up on the seismograph.']],
    [['dash', 'BOOM! Somebody check if the crowd is okay!']],
    [['doc', 'Somewhere, a mechanic just started crying and does not know why.']]
  ],
  partoff: [
    [['dash', 'THAT PART HAS LEFT THE CONVERSATION!']],
    [['doc', 'And a piece has decided to start a new life elsewhere.']],
    [['dash', 'There goes a part! Somebody catch it!']],
    [['doc', 'That was load bearing. Probably.']],
    [['dash', 'Bits are flying! We have bits flying!']],
    [['doc', "I'd call that a voluntary downsizing."]],
    [['dash', 'Free parts in the stands! Finders keepers!']]
  ],
  weaponoff: [
    [['doc', "And there go the teeth. That's going to make biting difficult."]],
    [['dash', 'The weapon is OFF! Ripped clean away!']],
    [['doc', 'Disarmed. Literally. I love this sport.']],
    [['dash', 'No gun, no problem? No, actually, that is a big problem!']]
  ],
  wreck: [
    [['dash', 'IT IS OVER! Someone sweep that up!']],
    [
      ['dash', "That's the end of the road!"],
      ['doc', 'Scrap value: four coins and a sad hubcap.']
    ],
    [['doc', 'And it has been returned to its natural state: junk.']],
    [['dash', 'Down it goes! DOWN IT GOES!']],
    [['dash', 'Total wreck! Call the insurance company, call its mum, call everybody!']],
    [['doc', 'Rest in pieces.']],
    [
      ['dash', 'Doc, is that legal?'],
      ['doc', 'Nothing about this sport is legal, Dash.']
    ],
    [['dash', 'KABLAMMO! That car is now a kit car!']]
  ],
  lowhp: [
    [['doc', 'That car is smoking. And not in the cool way.']],
    [['dash', 'One more hit and that thing turns into a puzzle!']],
    [['doc', 'The warning lights have their own warning lights.']],
    [['dash', "It's hanging on by a thread! A rusty, sad thread!"]]
  ],
  clutch: [
    [['dash', 'Held together by one bolt and incredible confidence!']],
    [['doc', 'By every law of physics, that car should be a pile of spoons.']],
    [['dash', 'It refuses to die! I respect it! I fear it!']],
    [['doc', 'Zero health, one hundred percent attitude.']]
  ],
  comeback: [
    [['dash', 'Look at it fight back! This is a COMEBACK!']],
    [['doc', 'Never count out a car with nothing left to lose.']],
    [['dash', 'From the scrap heap to the spotlight! Unbelievable!']]
  ],
  air: [
    [['dash', "It's FLYING! Nobody told it cars stay on the ground!"]],
    [['doc', 'Airtime. Not in the manual, but I approve.']],
    [['dash', 'Big air! Ten out of ten, no notes!']],
    [['doc', 'Gravity is merely a suggestion today.']]
  ],
  power: [
    [['doc', 'A power-up. That changes the maths.']],
    [['dash', 'Power-up! Here comes trouble!']],
    [['doc', 'Ooh, a little treat from the arena.']]
  ],
  boring: [
    [
      ['dash', 'Doc, are they... parking?'],
      ['doc', 'The crowd paid good scrap for this. Hit something!']
    ],
    [['doc', 'I can hear the booing from up here.']],
    [['dash', "Come on, this isn't a car show!"]],
    [
      ['doc', 'Is this a battle or a driving test?'],
      ['dash', 'Somebody fail it already!']
    ],
    [['dash', "I've seen more action in a car wash queue!"]]
  ],
  banter: [
    [
      ['dash', 'Doc, what is that car even made of?'],
      ['doc', 'Mostly tape. Some optimism.']
    ],
    [['doc', "This fight is brought to you by Rusty's Discount Bolts. Bolts so cheap, they're barely bolts."]],
    [['dash', "Fun fact: the cockpit is the only part with a seat belt. It's also held on with gum."]],
    [
      ['dash', 'Doc, if you were a car, what would you be?'],
      ['doc', 'A filing cabinet with wheels. Reliable. Heavy. Feared.']
    ],
    [['doc', "Brought to you by Gasket's Glue. When welding is too much effort."]],
    [['dash', 'My producer is telling me to calm down. I will NOT calm down!']],
    [
      ['doc', 'I used to race, you know.'],
      ['dash', 'Really?'],
      ['doc', 'Shopping trolleys. Undefeated.']
    ],
    [['dash', 'If you are just joining us: it is loud, it is messy, and somebody owes me a sandwich!']],
    [['doc', "Fun fact: this arena used to be a car park. The cars didn't like it either."]],
    [
      ['dash', 'Doc, my headset is smoking.'],
      ['doc', 'Probably just the vibes.']
    ]
  ],
  gift: [
    [['dash', 'The crowd loves it! Here comes a gift from the stands!']],
    [['doc', 'Fan mail! Hopefully not a brick this time.']],
    [['dash', 'They are THROWING THINGS! Nice things, I think!']]
  ],
  giftgot: [[['dash', 'Got the gift! The crowd goes wild!']], [['doc', 'Never refuse a present from the stands.']]],
  salvage: [[['doc', 'A bit of salvage. Waste not, want not.']], [['dash', 'A goodie in the scrap! Shiny!']]],
  stolen: [
    [['dash', 'Cheeky! Somebody stole the salvage!']],
    [['doc', 'That crate is gone for good. A professional thief.']]
  ],
  phase: [
    [['dash', 'The boss is getting ANGRY!']],
    [['doc', "When a boss changes phase, it's time to change plans."]],
    [['dash', 'Oh no. Oh no no no. It has a second form!']]
  ],
  masterwork: [[['doc', 'Look at that golden glow. Somebody brought masterwork gear.']]],
  setbonus: [[['dash', 'A full sticker set! Style AND substance!']]],
  close: [
    [['dash', 'Both cars are hanging by a thread!']],
    [['doc', 'Whoever lands the next hit wins this. Hold your breath.']],
    [['dash', "I can't look! I'm looking! I CAN'T LOOK!"]]
  ],
  lastsecs: [
    [['dash', 'Ten seconds left! Do something!']],
    [['doc', "The clock is not on anyone's side."]],
    [['dash', 'Running out of time! Hit the gas, hit the other guy, hit SOMETHING!']]
  ]
};
// The arena announcer (deep voice, stadium echo). Wave numbers past the list fall back to the system voice.
const NUM_WORDS =
  'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'
    .split(' ')
    .concat(
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map(
        n => 'twenty ' + 'one two three four five six seven eight nine'.split(' ')[n - 1]
      ),
      ['thirty']
    );
const ANNOUNCE = [
  ...NUM_WORDS.slice(1, 26).map(w => 'Round ' + w),
  ...NUM_WORDS.slice(1).map(w => 'Wave ' + w),
  'Final round',
  'Boss fight',
  'Round won',
  'Round lost',
  'Draw',
  'Victory',
  'Defeat',
  'New record',
  'Game over'
];
// Higher priority cuts in; low priority waits its turn or is dropped.
const COMM_PRI = {
  wreck: 5,
  phase: 4,
  clutch: 4,
  start: 3,
  gift: 3,
  firstblood: 3,
  comeback: 3,
  close: 3,
  lastsecs: 3,
  bighit: 2
};
/** Stable id for a spoken line, used for its voice clip (same function in tools/make-voices.mjs). */
function voiceId(who, text) {
  let h = 0x811c9dc5;
  const s = who + '|' + text;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}
