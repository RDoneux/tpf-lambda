import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { LambdaGatewayArgs } from "./interfaces/lambda";

export function loadCharacter({
  resourcePrefix,
  bucketName,
  bucketArn,
  apiId,
  resourceId,
}: LambdaGatewayArgs) {
  const lambdaRole = new aws.iam.Role(`${resourcePrefix}-get-role`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: "lambda.amazonaws.com",
    }),
  });

  new aws.iam.RolePolicyAttachment(`${resourcePrefix}-get-basic-execution`, {
    role: lambdaRole.name,
    policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
  });

  new aws.iam.RolePolicy(`${resourcePrefix}-get-s3-policy`, {
    role: lambdaRole.id,
    policy: bucketArn.apply((arn) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "s3:PutObject",
              "s3:GetObject",
              "s3:HeadBucket",
              "s3:CreateBucket",
            ],
            Resource: [arn, `${arn}/*`],
          },
        ],
      })
    ),
  });

  const loadCharacterSheetLambda = new aws.lambda.Function(
    `${resourcePrefix}-get-function`,
    {
      runtime: "nodejs22.x",
      code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("../dist/load-character-sheet"),
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

  new aws.cloudwatch.LogGroup(`${resourcePrefix}-get-log-group`, {
    name: pulumi.interpolate`/aws/lambda/${loadCharacterSheetLambda.name}`,
    retentionInDays: 14, // or your preferred retention
  });

  const loadCharacterSheetMethod = new aws.apigateway.Method(
    `${resourcePrefix}-get-method`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: "GET",
      authorization: "NONE",
    }
  );

  const loadCharacterSheetIntegration = new aws.apigateway.Integration(
    `${resourcePrefix}-get-integration`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: loadCharacterSheetMethod.httpMethod,
      integrationHttpMethod: "POST",
      type: "AWS_PROXY",
      uri: loadCharacterSheetLambda.invokeArn,
    },
    { dependsOn: [loadCharacterSheetMethod] }
  );

  new aws.apigateway.MethodResponse(
    `${resourcePrefix}-get-method-response`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: loadCharacterSheetMethod.httpMethod,
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
    { dependsOn: [loadCharacterSheetMethod] }
  );

  new aws.apigateway.IntegrationResponse(
    `${resourcePrefix}-get-integration-response`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: loadCharacterSheetMethod.httpMethod,
      statusCode: "200",
      responseParameters: {
        "method.response.header.Access-Control-Allow-Headers":
          "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        "method.response.header.Access-Control-Allow-Methods": "'GET'",
        "method.response.header.Access-Control-Allow-Origin": "'*'",
      },
    },
    {
      dependsOn: [loadCharacterSheetIntegration],
    }
  );

  const accountId = aws.getCallerIdentity().then((id) => id.accountId);
  const region = aws.config.region;
  const apiGatewayArn = pulumi.interpolate`arn:aws:execute-api:${region}:${accountId}:${apiId}/*/*/*`;

  // Grant API Gateway permission to invoke the Lambda
  new aws.lambda.Permission(`${resourcePrefix}-get-gateway-permission`, {
    action: "lambda:InvokeFunction",
    function: loadCharacterSheetLambda.name,
    principal: "apigateway.amazonaws.com",
    sourceArn: apiGatewayArn,
  });

  return {
    loadCharacterSheetMethod,
    loadCharacterSheetIntegration,
  };
}
