import {
  LambdaGatewayArgs,
  LambdaReturnArgs,
  LambdaSupportArgs,
} from "../interfaces/lambda";
import { createLambda } from "../utils/create-lambda";

export function getCampDetails(
  supportArgs: LambdaSupportArgs
): LambdaReturnArgs {
  const gatewayArgs: LambdaGatewayArgs = {
    ...supportArgs,
    s3PolicyActions: ["s3:GetObject", "s3:HeadBucket", "s3:ListBucket"],
    pathToDist: "../dist/camp/get-camp-details",
    httpMethod: "GET",
  };

  return createLambda("get-camp-details", gatewayArgs);
}
