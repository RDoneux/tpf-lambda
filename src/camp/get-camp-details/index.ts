import { GetObjectCommand, NoSuchKey, S3Client } from "@aws-sdk/client-s3";
import { corsHeaders, defaultCorsResponse } from "../../common/cors";

const s3 = new S3Client({ region: "eu-west-2" });

export const handler = async (event: any) => {
  defaultCorsResponse(event);

  const code = event.queryStringParameters?.code;

  if (!code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Camp code is required" }),
    };
  }

  try {
    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: `camps/${code}.json`,
    };

    const data = await s3.send(new GetObjectCommand(params));

    if (!data.Body) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Camp not found" }),
      };
    }

    const campDetails = await data.Body.transformToString();

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: campDetails,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error fetching camp details",
        error
      }),
    };
  }
};
