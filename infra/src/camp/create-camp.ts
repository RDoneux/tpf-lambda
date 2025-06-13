import { LambdaGatewayArgs, LambdaSupportArgs } from "../interfaces/lambda";
import { createLambda } from "../utils/create-lambda";

export function createCamp(supportArgs: LambdaSupportArgs) {
  const gatewayArgs: LambdaGatewayArgs = {
    ...supportArgs,
    s3PolicyActions: [
      "s3:PutObject",
      "s3:GetObject",
      "s3:HeadBucket",
      "s3:CreateBucket",
    ],
    pathToDist: "../dist/camp/create-camp",
    httpMethod: "POST",
  };

  return createLambda("create-camp", gatewayArgs);
}
