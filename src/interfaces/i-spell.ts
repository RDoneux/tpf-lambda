export interface ISpell {
  name: string;
  castingTime: string;
  range: string;
  components: ISpellComponents;
  duration: string;
  school: SpellSchool;
  description: string | null;
  page: string;
  material: string;
  effect: string;
  savingThrow: string
}

export interface ISpellComponents {
  verbal: boolean;
  somatic: boolean;
  material: boolean;
  focus: boolean;
  divineFocus: boolean;
}

export const SpellSchool = {
  Abjuration: "Abjuration",
  Conjuration: "Conjuration",
  Divination: "Divination",
  Enchantment: "Enchantment",
  Evocation: "Evocation",
  Illusion: "Illusion",
  Necromancy: "Necromancy",
  Transmutation: "Transmutation",
} as const;
export type SpellSchool = (typeof SpellSchool)[keyof typeof SpellSchool];
