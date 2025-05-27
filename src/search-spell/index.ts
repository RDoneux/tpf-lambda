import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { corsHeaders, defaultCorsResponse } from "../common/cors";
import { streamToString } from "../common/utils";
import { ISpell } from "../interfaces/i-spell";

const KEY = "spells/spellList.json";

const s3 = new S3Client({ region: "eu-west-2" });

export const handler = async (event: any) => {
  defaultCorsResponse(event);

  const searchName = event.queryStringParameters?.name ?? "";
  const searchClass = event.queryStringParameters?.class ?? "";
  const searchLevel = event.queryStringParameters?.level ?? "";
  const searchSchool = event.queryStringParameters?.school ?? "";
  const components = event.queryStringParameters?.components ?? "";

  try {
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: KEY,
      })
    );

    const body = result.Body ? await streamToString(result.Body) : null;

    const filteredBody = JSON.parse(body || "[]")
      .filter((spell: any) =>
        spell.name.toLowerCase().includes(searchName.toLowerCase())
      )
      .filter((spell: any) => {
        if (!searchClass) return true; // If no class is specified, include all spells
        return spell.class
          .split(", ")
          .some(
            (cls: string) => cls.toLowerCase() === searchClass.toLowerCase()
          );
      })
      .filter((spell: any) => {
        if (!searchLevel) return true; // If no level is specified, include all spells
        return spell.level.toString() === searchLevel;
      })
      .filter((spell: any) => {
        if (!searchSchool) return true; // If no school is specified, include all spells
        return spell.school.toLowerCase() === searchSchool.toLowerCase();
      })
      .filter((spell: any) => {
        if (!components) return true; // If no components are specified, include all spells
        const componentsArray = components
          .split(",")
          .map((c: string) => c.trim());
        return componentsArray.every((component: string) =>
          spell.components.includes(component)
        );
      })
      .map((spell: any) => mapToISpell(spell));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
      body:
        JSON.stringify(filteredBody) ||
        JSON.stringify({ message: "No spells found" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error loading spell list",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

function mapToISpell(spell: any): ISpell {
  return {
    name: spell.name,
    school: spell.school,
    castingTime: spell.castingTime,
    range: spell.range,
    components: {
      verbal: spell.components.includes("V"),
      somatic: spell.components.includes("S"),
      material: spell.components.includes("M"),
      focus: spell.components.includes("F"),
      divineFocus: spell.components.includes("DF"),
    },
    duration: spell.duration,
    description: spell.description,
    page: spell["Spell Links-href"],
    material: spell.material,
    effect: spell.effect,
    savingThrow: spell.savingThrow,
  };
}
