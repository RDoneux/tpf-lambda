import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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
    const bodyToUpload = typeof body === "string" ? body : JSON.stringify(body);
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: key,
        Body: bodyToUpload,
        ContentType: contentType,
      })
    );

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
