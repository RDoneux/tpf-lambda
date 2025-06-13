import {
  LambdaGatewayArgs,
  LambdaReturnArgs,
  LambdaSupportArgs,
} from "./interfaces/lambda";
import { createLambda } from "./utils/create-lambda";

export function loadCharacterList(
  supportArgs: LambdaSupportArgs
): LambdaReturnArgs {
  const gatewayArgs: LambdaGatewayArgs = {
    ...supportArgs,
    s3PolicyActions: [
      "s3:PutObject",
      "s3:GetObject",
      "s3:HeadBucket",
      "s3:CreateBucket",
      "s3:ListBucket",
    ],
    pathToDist: "../dist/get-character-list",
    httpMethod: "GET",
  };

  return createLambda("get-character-list", gatewayArgs);
}
