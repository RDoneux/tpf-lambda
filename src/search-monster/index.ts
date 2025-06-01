import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { streamToString } from "../common/utils";
import { IMonster } from "../interfaces/i-monster";
import { corsHeaders, defaultCorsResponse } from "../common/cors";

const KEY = "monsters/monsters.json";

const s3 = new S3Client({ region: "eu-west-2" });

export const handler = async (event: any) => {
  defaultCorsResponse(event);

  const searchName = event.queryStringParameters?.name ?? "";

  try {
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: KEY,
      })
    );

    const body = result.Body ? await streamToString(result.Body) : null;

    const filteredBody = JSON.parse(body || "[]")
      .filter((monster: any) =>
        monster.name.toLowerCase().includes(searchName.toLowerCase())
      )
      .map((monster: any) => mapToIMonster(monster));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
      body: JSON.stringify(filteredBody),
    };
  } catch (error) {
    console.error("Error fetching monsters:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
      body: JSON.stringify({ error: "Failed to fetch monsters" }),
    };
  }
};

function mapToIMonster(monster: any): IMonster {
  return {
    name: monster.name,
    size: monster.size,
    type: monster.type,
    hitDice: monster.hitDice,
    initiative: monster.initiative,
    speed: monster.speed,
    armourClass: monster.armorClass,
    baseAttack: monster.baseAttack,
    grapple: monster.grapple,
    attack: monster.attack,
    spaceReach: monster.spaceReach,
    specialAttacks: monster.specialAttacks,
    specialQualities: monster.specialQualities,
    saves: {
      fortitude: monster.saves.fortitude,
      reflex: monster.saves.reflex,
      will: monster.saves.will,
    },
    abilities: {
      strength: monster.abilities.strength,
      dexterity: monster.abilities.dexterity,
      constitution: monster.abilities.constitution,
      intelligence: monster.abilities.intelligence,
      wisdom: monster.abilities.wisdom,
      charisma: monster.abilities.charisma,
    },
    skills: monster.skills || {},
    feats: monster.feats || [],
    environment: monster.environment || "",
    organisation: monster.organization || "",
    challengeRating: monster.challengeRating || "",
    treasure: monster.treasure || "",
    alignment: monster.alignment || "",
    description: monster.description || "",
    link: monster.link || ""
  };
}
