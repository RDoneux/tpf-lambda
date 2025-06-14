import {
  LambdaGatewayArgs,
  LambdaReturnArgs,
  LambdaSupportArgs,
} from "./interfaces/lambda";
import { createLambda } from "./utils/create-lambda";

export function saveCharacter(
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
      "s3:DeleteObject",
    ],
    pathToDist: "../dist/save-character-sheet",
    httpMethod: "POST",
  };
  return createLambda("save-character-sheet", gatewayArgs);
}
