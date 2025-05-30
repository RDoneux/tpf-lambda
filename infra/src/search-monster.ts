import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { LambdaGatewayArgs } from "./interfaces/lambda";

export function searchMonster({
  resourcePrefix,
  bucketName,
  bucketArn,
  apiId,
  resourceId,
}: LambdaGatewayArgs) {
  const lambdaRole = new aws.iam.Role(`${resourcePrefix}-search-monster-role`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: "lambda.amazonaws.com",
    }),
  });

  new aws.iam.RolePolicyAttachment(`${resourcePrefix}-search-monster-basic-execution`, {
    role: lambdaRole.name,
    policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
  });

  new aws.iam.RolePolicy(`${resourcePrefix}-search-monster-s3-policy`, {
    role: lambdaRole.id,
    policy: bucketArn.apply((arn) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["s3:GetObject", "s3:ListBucket"],
            Resource: [arn, `${arn}/monsters/*`],
          },
        ],
      })
    ),
  });

  const searchMonsterLambda = new aws.lambda.Function(
    `${resourcePrefix}-search-monster-function`,
    {
      runtime: "nodejs22.x",
      code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("../dist/search-monster"),
      }),
      handler: "index.handler",
      role: lambdaRole.arn,
      environment: {
        variables: {
          BUCKET_NAME: bucketName,
        },
      },
    }
  );

  new aws.cloudwatch.LogGroup(`${resourcePrefix}-search-monster-log-group`, {
    name: pulumi.interpolate`/aws/lambda/${searchMonsterLambda.name}`,
    retentionInDays: 14, // or your preferred retention
  });

  const searchMonsterMethod = new aws.apigateway.Method(
    `${resourcePrefix}-search-monster-method`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: "GET",
      authorization: "NONE",
    }
  );

  const searchMonsterIntegration = new aws.apigateway.Integration(
    `${resourcePrefix}-search-monster-integration`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: searchMonsterMethod.httpMethod,
      type: "AWS_PROXY",
      integrationHttpMethod: "POST",
      uri: searchMonsterLambda.invokeArn,
    },
    { dependsOn: [searchMonsterMethod] }
  );

  new aws.apigateway.MethodResponse(
    `${resourcePrefix}-search-monster-method-response`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: searchMonsterMethod.httpMethod,
      statusCode: "200",
      responseParameters: {
        "method.response.header.Access-Control-Allow-Origin": true,
        "method.response.header.Access-Control-Allow-Methods": true,
        "method.response.header.Access-Control-Allow-Headers": true,
      },
      responseModels: {
        "application/json": "Empty",
      },
    },
    { dependsOn: [searchMonsterMethod] }
  );

  new aws.apigateway.IntegrationResponse(
    `${resourcePrefix}-search-monster-integration-response`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: searchMonsterMethod.httpMethod,
      statusCode: "200",
      responseParameters: {
        "method.response.header.Access-Control-Allow-Origin": "'*'",
        "method.response.header.Access-Control-Allow-Methods": "'GET,OPTIONS'",
        "method.response.header.Access-Control-Allow-Headers":
          "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
      },
    },
    { dependsOn: [searchMonsterIntegration] }
  );

  const accountId = aws.getCallerIdentity().then((id) => id.accountId);
  const region = aws.config.region;
  const apiGatewayArn = pulumi.interpolate`arn:aws:execute-api:${region}:${accountId}:${apiId}/*/*/*`;

  new aws.lambda.Permission(`${resourcePrefix}-search-monster-permission`, {
    action: "lambda:InvokeFunction",
    function: searchMonsterLambda.name,
    principal: "apigateway.amazonaws.com",
    sourceArn: apiGatewayArn,
  });

  return {
    searchMonsterMethod: searchMonsterMethod,
    searchMonsterIntegration: searchMonsterIntegration,
  };
}
