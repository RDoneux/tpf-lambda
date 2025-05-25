import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
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
      body: JSON.stringify({ message: "Missing bucket or key" }),
    };
  }

  try {
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: key,
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
