import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { corsHeaders, defaultCorsResponse } from "../../common/cors";
import { Camp } from "./camp.model";

const s3 = new S3Client({ region: "eu-west-2" });

export const handler = async (event: any) => {
  defaultCorsResponse(event);

  const { name } = JSON.parse(event.body || "{}");
  const code = generateCampCode();

  const camp: Camp = {
    details: {
      name,
      code,
    },
  };

  try {
    const bodyToUpload = JSON.stringify(camp);
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: `camps/${name}.json`,
        Body: bodyToUpload,
        ContentType: "application/json",
      })
    );

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Camp created successfully",
        code,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error saving character sheet",
        error,
      }),
    };
  }
};

function generateCampCode(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}
