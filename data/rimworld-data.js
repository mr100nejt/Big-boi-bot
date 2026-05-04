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

function randomScenario() {
  return SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
}

module.exports = { randomEvent, randomScenario };
