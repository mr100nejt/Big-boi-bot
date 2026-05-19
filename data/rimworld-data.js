const EVENTS = [
  { title: 'Raid!', desc: 'A tribal raider party has spotted your colony. {count} hostiles approaching from the {dir}. Your turrets are at {pct}% power.' },
  { title: 'Mental Break', desc: '{name} has entered a {break} state after {days} days without a decent bed. They are now {action}.' },
  { title: 'Trade Caravan', desc: 'A {faction} caravan has arrived. They\'re offering {item} for an unreasonable price. Your silver stores: {silver}.' },
  { title: 'Solar Flare', desc: 'A solar flare has knocked out all electrical systems. The freezer temperature is rising. You have {hours} hours before the food spoils.' },
  { title: 'New Colonist', desc: 'A wanderer named {name} has arrived seeking refuge. Skills: {skill1} {lvl1}, {skill2} {lvl2}. Trait: {trait}.' },
  { title: 'Disease Outbreak', desc: '{name} has contracted {disease}. Without {treatment}, they have {days} days before serious deterioration.' },
  { title: 'Animal Manhunter', desc: 'A pack of {count} {animal}s has gone manhunter. They have already downed one colonist.' },
  { title: 'Psychic Drone', desc: 'A psychic drone ship has entered orbit. All colonists with mood below {mood} are at risk of breaking.' },
  { title: 'Fire!', desc: 'An electrical fire has started in the {room}. The flames are spreading toward your {item}.' },
  { title: 'Mechanoid Cluster', desc: 'A mechanoid cluster has landed {dist} tiles from your base. It contains {count} centipedes and a mortar.' },
  { title: 'Toxic Fallout', desc: 'Toxic fallout has begun. All unroofed areas are now hazardous. Duration: {days} days.' },
  { title: 'Organ Harvesting Request', desc: 'Outlander {name} is offering {silver} silver for one of your colonist\'s kidneys. No questions asked.' },
  { title: 'Prisoner Escape Attempt', desc: 'Your prisoner {name} has broken their restraints and is heading for the exit with a {weapon} they somehow found.' },
  { title: 'Dropped Supply Pod', desc: 'A supply pod has crash-landed near your base. Contents: {item}. Warning: it landed inside a hostile village.' },
  { title: 'Grudge Raid', desc: 'A {faction} assault team has arrived seeking vengeance for the {pawn} you killed {days} days ago.' },
  { title: 'Cold Snap', desc: 'Temperatures have dropped to {temp}°C. Your heating system is running at {pct}% capacity.' },
  { title: 'Blight', desc: 'A crop blight has infected your {crop} field. {pct}% of the harvest is already lost.' },
  { title: 'Thrumbo Sighting', desc: 'A lone thrumbo has wandered near your base. Your most trigger-happy colonist is eyeing it.' },
  { title: 'Art Commission', desc: 'A passing artist wants to trade a {quality} {arttype} sculpture for safe passage. The piece depicts "{subject}".' },
  { title: 'Heatwave', desc: 'External temperatures have reached {temp}°C. Cooling is failing in the {room}.' },
];

const SCENARIOS = [
  { title: 'Naked Brutality', desc: 'Start with one colonist. No map. No clothes. No food. Just a handgun and spite. Permadeath enabled.' },
  { title: 'Losing is Fun', desc: 'Randy Random, Rough difficulty. Commit to never fleeing. Defend your base to the last colonist.' },
  { title: 'Solo Speedrun', desc: 'One colonist must build a ship and launch before year 5. No base expanding beyond a 20x20 area.' },
  { title: 'Pacifist Colony', desc: 'No colonist may directly attack a human. Turrets and traps only. Can you still survive?' },
  { title: 'Prison Warden', desc: 'Your only income source is recruiting and selling colonists. Must maintain at least 10 prisoners at all times.' },
  { title: 'Medieval Only', desc: 'No electricity. No advanced tech. Survive using only medieval-era research. Tribal start required.' },
  { title: 'The Long Walk', desc: 'Start at the ice sheet biome. Must survive 3 full years before launching a ship.' },
  { title: 'Cannibal Colony', desc: 'All colonists must have the Cannibal trait. No growing crops — survive entirely on... other sources.' },
  { title: 'Organ Empire', desc: 'Fund your entire colony through organ harvesting. Build the most profitable black-market operation on the rim.' },
  { title: 'The Architect', desc: 'All rooms must be at least Impressive quality before the next colonist is allowed to join.' },
  { title: 'Ideology Purge', desc: 'Start a colony with a strict ideology and convert or exile every NPC who joins with a different one.' },
  { title: 'Zoo Keeper', desc: 'You must tame at least 30 different animal species before you are allowed to build a ship.' },
  { title: 'Drug Lord', desc: 'Your only permitted trade goods are drugs. All colonists must have a drug policy and use them regularly.' },
  { title: 'The Undertaker', desc: 'Every colonist who dies must receive a proper burial with a quality grave. No exceptions, even during raids.' },
  { title: 'Minimum Viable Colony', desc: 'Launch a ship using the fewest number of colonists possible. No thralls, no prisoners. Pure efficiency.' },
];

const NAMES = ['Bob', 'Maria', 'Zhukov', 'Priya', 'Henrik', 'Sable', 'Orion', 'Wren', 'Gareth', 'Nadia', 'Tariq', 'Elara'];
const BREAKS = ['wandering', 'binging', 'fire starting', 'insulting', 'catatonic'];
const ANIMALS = ['wolf', 'bear', 'elephant', 'boar', 'cobra', 'megascarab', 'cougar', 'rhinoceros'];
const FACTIONS = ['outlander', 'tribal', 'pirate', 'empire'];
const TRAITS = ['Pyromaniac', 'Bloodlust', 'Gourmand', 'Nimble', 'Iron Will', 'Too Smart', 'Sanguine', 'Tortured Artist'];
const DISEASES = ['plague', 'flu', 'gut worms', 'muscle parasites', 'fibrous mechanites'];
const ITEMS = ['plasteel', 'uranium', 'advanced components', 'charge rifles', 'glitterworld medicine'];
const DIRECTIONS = ['north', 'south', 'east', 'west', 'northwest', 'northeast'];
const ART_SUBJECTS = ['a colonist being eaten by a bear', 'the darkness of space', 'a man standing alone on a hill', 'nothing in particular', 'a raid that went poorly'];

function randomEvent() {
  const template = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  return {
    title: template.title,
    desc: template.desc
      .replace('{name}', name)
      .replace('{count}', Math.floor(Math.random() * 12) + 3)
      .replace('{dir}', DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)])
      .replace('{pct}', Math.floor(Math.random() * 60) + 20)
      .replace('{days}', Math.floor(Math.random() * 10) + 2)
      .replace('{hours}', Math.floor(Math.random() * 6) + 1)
      .replace('{break}', BREAKS[Math.floor(Math.random() * BREAKS.length)])
      .replace('{action}', 'wandering the map muttering')
      .replace('{faction}', FACTIONS[Math.floor(Math.random() * FACTIONS.length)])
      .replace('{item}', ITEMS[Math.floor(Math.random() * ITEMS.length)])
      .replace('{silver}', Math.floor(Math.random() * 800) + 200)
      .replace('{animal}', ANIMALS[Math.floor(Math.random() * ANIMALS.length)])
      .replace('{disease}', DISEASES[Math.floor(Math.random() * DISEASES.length)])
      .replace('{treatment}', 'glitterworld medicine')
      .replace('{trait}', TRAITS[Math.floor(Math.random() * TRAITS.length)])
      .replace('{skill1}', 'Shooting').replace('{lvl1}', Math.floor(Math.random() * 8) + 1)
      .replace('{skill2}', 'Construction').replace('{lvl2}', Math.floor(Math.random() * 8) + 1)
      .replace('{room}', 'storage room')
      .replace('{mood}', Math.floor(Math.random() * 20) + 30)
      .replace('{dist}', Math.floor(Math.random() * 30) + 10)
      .replace('{weapon}', 'shiv')
      .replace('{temp}', -(Math.floor(Math.random() * 30) + 10))
      .replace('{crop}', 'potato')
      .replace('{quality}', 'masterwork')
      .replace('{arttype}', 'stone')
      .replace('{subject}', ART_SUBJECTS[Math.floor(Math.random() * ART_SUBJECTS.length)])
      .replace('{pawn}', name)
  };
}

// Seed category tags for filtering
const SEEDS = [
  {
    seed: 'shiv',
    biome: 'Temperate Forest',
    coords: '27.20°N, 25.88°W',
    mapSize: '250x250',
    tag: 'defensive',
    why: 'Single-entry chokepoint with two steam geysers inside the perimeter. Near-impenetrable natural fortress — perfect for a turtle playstyle.',
  },
  {
    seed: 'seed parka',
    biome: 'Temperate Forest',
    coords: '22.09°N, 27.70°E',
    mapSize: '250x250',
    tag: 'OP',
    why: 'Three geysers packed into one defensible mountain clearing. Basically free geothermal power forever — widely considered one of the best power starts in the game.',
  },
  {
    seed: 'konstantin',
    biome: 'Temperate Forest',
    coords: '35.11°N, 56.15°W',
    mapSize: '250x250',
    tag: 'defensive',
    why: 'Two natural alcoves give you a secure inner base plus room to expand. Great for players who like a structured, fortified layout.',
  },
  {
    seed: 'donatello',
    biome: 'Boreal Forest',
    coords: '44.20°N, 5.81°W',
    mapSize: '250x250',
    tag: 'resource-rich',
    why: 'River + geysers + mountains in a boreal tile. Dense ore deposits make it one of the best mining starts around. Cold climate keeps raiders manageable early on.',
  },
  {
    seed: 'hill to die on',
    biome: 'Tropical Rainforest',
    coords: '16.27°N, 5.77°W',
    mapSize: '250x250',
    tag: 'defensive',
    why: 'A tight, easily-walled rainforest alcove with a single entrance and solid mining potential behind it. Small enough to defend solo, big enough to grow into.',
  },
  {
    seed: 'interplanetary',
    biome: 'Temperate Forest',
    coords: '34.35°N, 29.97°E',
    mapSize: '250x250',
    tag: 'balanced',
    why: 'Granite and sandstone mountains with two steam geysers in a protected valley. 30-day growing season hits the sweet spot between farming and survival.',
  },
  {
    seed: 'agony',
    biome: 'Boreal Forest',
    coords: '25.10°N, 7.78°W',
    mapSize: '250x250',
    tag: 'challenge',
    why: 'Cold mountain tile with a single exit — great for a brutal, defensive run. The climate pressure keeps things interesting the whole way through.',
  },
  {
    seed: 'lyle',
    biome: 'Temperate Forest',
    coords: '30.00°N, 15.00°W',
    mapSize: '250x250',
    tag: 'OP',
    why: 'Coastal strip between two mountain ranges with four geysers. 40-day growing season, two natural walls, and enough geothermal power to run a small city.',
  },
  {
    seed: '100ManTest',
    biome: 'Temperate Forest',
    coords: '0.58°N, 16.30°W',
    mapSize: '250x250',
    tag: 'defensive',
    why: 'Mountain range hugging the coast with only two openings to seal. Classic "fortress with a view" layout — beloved for mass-colonist runs.',
  },
  {
    seed: 'pandamandokantolando',
    biome: 'Tropical Rainforest',
    coords: '2.93°N, 5.72°E',
    mapSize: '250x250',
    tag: 'fun',
    why: 'River through the middle of a lush rainforest. Reliable hydroelectric power, year-round farming, and the name alone makes it worth picking.',
  },
  {
    seed: 'ultrafine',
    biome: 'Temperate Forest',
    coords: '16.12°N, 13.12°W',
    mapSize: '250x250',
    tag: 'balanced',
    why: 'Fertile mountain tile with a creek and solid ore access. Well-rounded start without any major drawbacks — good all-rounder for new players.',
  },
  {
    seed: 'settlement',
    biome: 'Temperate Forest',
    coords: '25.94°N, 22.46°W',
    mapSize: '275x275',
    tag: 'fun',
    why: 'Features a buried vault structure on the map — an ancient relic to explore, loot, and build around. Adds a story layer most seeds lack.',
  },
];

const TAG_COLORS = {
  'OP':           0xf5c518,
  'defensive':    0x57f287,
  'resource-rich':0x3498db,
  'balanced':     0x95a5a6,
  'challenge':    0xed4245,
  'fun':          0xe67e22,
};

function randomSeed(tag = null) {
  const pool = tag ? SEEDS.filter(s => s.tag === tag) : SEEDS;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function randomScenario() {
  return SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
}

module.exports = { randomEvent, randomScenario, randomSeed, TAG_COLORS, SEEDS };
