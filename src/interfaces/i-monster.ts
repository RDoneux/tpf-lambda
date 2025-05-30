export interface IMonster {
  name: string;
  size: string;
  type: string;
  hitDice: string;
  initiative: string;
  speed: string;
  armourClass: string;
  baseAttack: string;
  grapple: string;
  attack: string;
  spaceReach: string;
  specialAttacks: string;
  specialQualities: string;
  saves: {
    fortitude: string;
    reflex: string;
    will: string;
  };
  abilities: {
    strength: string;
    dexterity: string;
    constitution: string;
    intelligence: string;
    wisdom: string;
    charisma: string;
  };
  skills: {
    [key: string]: string;
  };
  feats: string[];
  environment: string;
  organisation: string;
  challengeRating: string;
  treasure: string;
  alignment: string;
  description: string;
  link: string;
}
