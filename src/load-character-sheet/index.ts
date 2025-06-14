import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { corsHeaders, defaultCorsResponse } from "../common/cors";
import { streamToString } from "../common/utils";

const s3 = new S3Client({ region: "eu-west-2" });

export const handler = async (event: any) => {
  defaultCorsResponse(event);

  const key = event.queryStringParameters?.key;
  const contentType =
    event.queryStringParameters?.contentType || "application/json";

  if (!key) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing key" }),
    };
  }

  try {
    const listCharactersCommand = new ListObjectsV2Command({
      Bucket: process.env.BUCKET_NAME,
      Prefix: "character-sheets/",
      Delimiter: "/",
    });

    const characterList = await s3.send(listCharactersCommand);
    const matchingKeys = (characterList.Contents ?? [])
      .map((object) => object.Key ?? "")
      .filter((k) => k.startsWith(key.replace(/\.json$/, "")));

    if (matchingKeys.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Character sheet not found",
        }),
      };
    }

    if (matchingKeys.length > 1) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Multiple character sheets found with the same key",
          keys: matchingKeys,
        }),
      };
    }

    const result = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: matchingKeys[0],
      })
    );

    const body = result.Body ? await streamToString(result.Body) : null;

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
      },
      body,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error loading character sheet",
        error,
      }),
    };
  }
};
