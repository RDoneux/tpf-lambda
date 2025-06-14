import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { corsHeaders, defaultCorsResponse } from "../common/cors";

const s3 = new S3Client({ region: "eu-west-2" });

export const handler = async (event: any) => {
  defaultCorsResponse(event);

  const {
    key,
    body,
    contentType = "application/json",
  } = JSON.parse(event.body || "{}");

  if (!key || !body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing bucket, key, or body" }),
    };
  }

  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.BUCKET_NAME,
      Prefix: "character-sheets/",
      Delimiter: "/",
    });

    const response = await s3.send(command);
    const pairs = (response.Contents ?? [])
      .map((object) => object.Key ?? "")
      .filter((key) => key !== "")
      .map((key) => key.replace("character-sheets/", "").split("|:|"));

    const fileNames = pairs.map((pair) => pair[0]);
    const fileIds = pairs.map((pair) => pair[1]);

    const [characterName, characterId] = key
      .replace("character-sheets/", "")
      .split("|:|");

    const bodyToUpload = typeof body === "string" ? body : JSON.stringify(body);

    const idIsUsed = fileIds.indexOf(characterId);
    if (idIsUsed === -1 || fileNames[idIsUsed] === characterName) {
      // character sheet hasn't been previously saved or there is a matching key - can just save it
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: key,
          Body: bodyToUpload,
          ContentType: contentType,
        })
      );
    }

    if (idIsUsed === -1 && fileNames.includes(characterName)) {
      // character name is already used with a different id - return error
      return {
        statusCode: 409,
        body: JSON.stringify({
          message: `Character name "${characterName}" already exists.`,
        }),
      };
    }

    if (idIsUsed > -1 && fileNames[idIsUsed] !== characterName) {
      // id is already used with a different character name - need to update the existing file name
      const oldKey = `character-sheets/${fileNames[idIsUsed]}|:|${fileIds[idIsUsed]}`;
      const CopySource = `${process.env.BUCKET_NAME}/character-sheets/${fileNames[idIsUsed]}|:|${fileIds[idIsUsed]}`;
      const copyOldObject = new CopyObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        CopySource,
        Key: key,
      });

      const deleteOldObject = new DeleteObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: oldKey,
      });

      await s3.send(copyOldObject);
      await s3.send(deleteOldObject);
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
      },
      body: JSON.stringify({
        message: "Character sheet saved successfully",
        key,
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
