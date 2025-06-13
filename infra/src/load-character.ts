import {
  LambdaGatewayArgs,
  LambdaReturnArgs,
  LambdaSupportArgs,
} from "./interfaces/lambda";
import { createLambda } from "./utils/create-lambda";

export function loadCharacter(
  supportArgs: LambdaSupportArgs
): LambdaReturnArgs {
  const gatewayArgs: LambdaGatewayArgs = {
    ...supportArgs,
    s3PolicyActions: [
      "s3:PutObject",
      "s3:GetObject",
      "s3:HeadBucket",
      "s3:CreateBucket",
    ],
    pathToDist: "../dist/load-character-sheet",
    httpMethod: "GET",
  };
  return createLambda("load-character-sheet", gatewayArgs);
}
