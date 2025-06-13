import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export interface LambdaGatewayArgs extends LambdaSupportArgs {
  s3PolicyActions: s3PolicyActions[];
  pathToDist: string;
  httpMethod: httpMethod;
}

export interface LambdaSupportArgs {
  bucketName: pulumi.Output<string>;
  bucketArn: pulumi.Output<string>;
  restApi: pulumi.Output<string>;
  resourceId: pulumi.Output<string>;
}

export type LambdaReturnArgs = (
  | aws.apigateway.Method
  | aws.apigateway.Integration
)[];

export const s3PolicyActions = {
  PUT: "s3:PutObject",
  GET: "s3:GetObject",
  HEAD: "s3:HeadBucket",
  CREATE: "s3:CreateBucket",
  LIST: "s3:ListBucket",
  DELETE: "s3:DeleteObject",
} as const;
export type s3PolicyActions =
  (typeof s3PolicyActions)[keyof typeof s3PolicyActions];

export const httpMethod = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  HEAD: "HEAD",
  OPTIONS: "OPTIONS",
  ANY: "ANY",
} as const;
export type httpMethod = (typeof httpMethod)[keyof typeof httpMethod];
