const HEROES = {
  tank: ['D.Va', 'Doomfist', 'Junker Queen', 'Mauga', 'Orisa', 'Ramattra', 'Reinhardt', 'Roadhog', 'Sigma', 'Winston', 'Wrecking Ball', 'Zarya'],
  damage: ['Ashe', 'Bastion', 'Cassidy', 'Echo', 'Genji', 'Hanzo', 'Junkrat', 'Mei', 'Pharah', 'Reaper', 'Sojourn', 'Soldier: 76', 'Sombra', 'Symmetra', 'Torbjörn', 'Tracer', 'Venture', 'Widowmaker'],
  support: ['Ana', 'Baptiste', 'Brigitte', 'Illari', 'Juno', 'Kiriko', 'Lifeweaver', 'Lúcio', 'Mercy', 'Moira', 'Zenyatta'],
};

const ALL_HEROES = [...HEROES.tank, ...HEROES.damage, ...HEROES.support];

const CHALLENGES = [
  'Win 3 games without dying more than once per match',
  'Play an entire match without using your ultimate',
  'Get a 4-player eliminations with your ultimate in a single use',
  'Win a match while only playing flanking routes',
  'Finish a match with a 3:1 kill/death ratio',
  'Win 2 matches on {hero} without swapping off',
  'Solo-queue and win 3 matches in a row',
  'Get a game-winning team fight with 0 deaths',
  'Win a control map 2-0 without the enemy ever capturing a point',
  'Win a match where your team never loses a team fight',
  'Play support and end with the highest healing in the lobby',
  'Play tank and never let your supports drop below 50% health in a team fight',
  'Win a payload match with more than 2 minutes remaining',
  'Get 3 environmental kills in a single match',
  'Win a match coming back from 0-2 on a control map',
];

const MAPS = ['King\'s Row', 'Hanamura', 'Eichenwalde', 'Hollywood', 'Ilios', 'Nepal', 'Oasis', 'Lijiang Tower', 'Watchpoint: Gibraltar', 'Dorado', 'Route 66', 'Rialto', 'Numbani', 'Blizzard World'];

function randomHero(role = null) {
  if (role && HEROES[role]) {
    const pool = HEROES[role];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return ALL_HEROES[Math.floor(Math.random() * ALL_HEROES.length)];
}

function randomChallenge() {
  const template = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
  const hero = randomHero();
  return template.replace('{hero}', hero);
}

function randomMap() {
  return MAPS[Math.floor(Math.random() * MAPS.length)];
}

module.exports = { HEROES, ALL_HEROES, randomHero, randomChallenge, randomMap };
