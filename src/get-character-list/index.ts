import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { corsHeaders, defaultCorsResponse } from "../common/cors";

const s3 = new S3Client({ region: "eu-west-2" });

export const handler = async (event: any) => {
  defaultCorsResponse(event);

  const command = new ListObjectsV2Command({
    Bucket: process.env.BUCKET_NAME,
    Prefix: "character-sheets/",
    Delimiter: "/",
  });

  try {
    const response = await s3.send(command);
    const filenames = (response.Contents ?? [])
      .map((object) => object.Key ?? "")
      .map((key) => key.replace(/^character-sheets\//, ""))
      .map((key) => key.replace(/\.json$/, ""))
      .map((key) => key.split("|:|")[0])
      .filter((key) => key !== "");

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },

      body: JSON.stringify(filenames),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error loading character sheet list",
        error,
      }),
    };
  }
};
