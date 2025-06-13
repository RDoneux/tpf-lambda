import {
  LambdaGatewayArgs,
  LambdaReturnArgs,
  LambdaSupportArgs,
} from "./interfaces/lambda";
import { createLambda } from "./utils/create-lambda";

export function searchSpell(supportArgs: LambdaSupportArgs): LambdaReturnArgs {
  const gatewayArgs: LambdaGatewayArgs = {
    ...supportArgs,
    s3PolicyActions: ["s3:GetObject", "s3:ListBucket"],
    pathToDist: "../dist/search-spell",
    httpMethod: "GET",
  };
  return createLambda("search-spell", gatewayArgs);
}
