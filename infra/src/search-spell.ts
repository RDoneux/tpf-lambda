import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { LambdaGatewayArgs } from "./interfaces/lambda";

export function searchSpell({
  resourcePrefix,
  bucketName,
  bucketArn,
  apiId,
  resourceId,
}: LambdaGatewayArgs) {
  const lambdaRole = new aws.iam.Role(`${resourcePrefix}-search-role`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: "lambda.amazonaws.com",
    }),
  });

  new aws.iam.RolePolicyAttachment(`${resourcePrefix}-search-basic-execution`, {
    role: lambdaRole.name,
    policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
  });

  new aws.iam.RolePolicy(`${resourcePrefix}-search-s3-policy`, {
    role: lambdaRole.id,
    policy: bucketArn.apply((arn) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["s3:GetObject", "s3:ListBucket"],
            Resource: [arn, `${arn}/spells/*`],
          },
        ],
      })
    ),
  });

  const searchSpellLambda = new aws.lambda.Function(
    `${resourcePrefix}-search-function`,
    {
      runtime: "nodejs22.x",
      code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("../dist/search-spell"),
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

  new aws.cloudwatch.LogGroup(`${resourcePrefix}-search-log-group`, {
    name: pulumi.interpolate`/aws/lambda/${searchSpellLambda.name}`,
    retentionInDays: 14, // or your preferred retention
  });

  const searchSpellMethod = new aws.apigateway.Method(
    `${resourcePrefix}-search-method`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: "GET",
      authorization: "NONE",
    }
  );

  const searchSpellIntegration = new aws.apigateway.Integration(
    `${resourcePrefix}-search-integration`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: searchSpellMethod.httpMethod,
      type: "AWS_PROXY",
      integrationHttpMethod: "POST",
      uri: searchSpellLambda.invokeArn,
    },
    { dependsOn: [searchSpellMethod] }
  );

  new aws.apigateway.MethodResponse(
    `${resourcePrefix}-search-method-response`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: searchSpellMethod.httpMethod,
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
    { dependsOn: [searchSpellMethod] }
  );

  new aws.apigateway.IntegrationResponse(
    `${resourcePrefix}-search-integration-response`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: searchSpellMethod.httpMethod,
      statusCode: "200",
      responseParameters: {
        "method.response.header.Access-Control-Allow-Origin": "'*'",
        "method.response.header.Access-Control-Allow-Methods": "'GET,OPTIONS'",
        "method.response.header.Access-Control-Allow-Headers":
          "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
      },
    },
    { dependsOn: [searchSpellIntegration] }
  );

  const accountId = aws.getCallerIdentity().then((id) => id.accountId);
  const region = aws.config.region;
  const apiGatewayArn = pulumi.interpolate`arn:aws:execute-api:${region}:${accountId}:${apiId}/*/*/*`;

  new aws.lambda.Permission(`${resourcePrefix}-search-permission`, {
    action: "lambda:InvokeFunction",
    function: searchSpellLambda.name,
    principal: "apigateway.amazonaws.com",
    sourceArn: apiGatewayArn,
  });

  return {
    searchSpellMethod,
    searchSpellIntegration,
  };
}
