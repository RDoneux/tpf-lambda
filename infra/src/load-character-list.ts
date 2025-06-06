import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { LambdaGatewayArgs } from "./interfaces/lambda";

export function loadCharacterList({
  resourcePrefix,
  bucketName,
  bucketArn,
  apiId,
  resourceId,
}: LambdaGatewayArgs) {
  const listResource = new aws.apigateway.Resource(
    `${resourcePrefix}-get-list-resource`,
    {
      restApi: apiId,
      parentId: resourceId,
      pathPart: "list",
    }
  );

  const lambdaRole = new aws.iam.Role(`${resourcePrefix}-get-list-role`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: "lambda.amazonaws.com",
    }),
  });

  new aws.iam.RolePolicyAttachment(
    `${resourcePrefix}-get-list-basic-execution`,
    {
      role: lambdaRole.name,
      policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
    }
  );

  new aws.iam.RolePolicy(`${resourcePrefix}-get-list-s3-policy`, {
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
              "s3:ListBucket",
            ],
            Resource: [arn, `${arn}/*`],
          },
        ],
      })
    ),
  });

  const loadCharacterSheetListLambda = new aws.lambda.Function(
    `${resourcePrefix}-get-list-function`,
    {
      runtime: "nodejs22.x",
      code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("../dist/get-character-list"),
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

  new aws.cloudwatch.LogGroup(`${resourcePrefix}-get-list-log-group`, {
    name: pulumi.interpolate`/aws/lambda/${loadCharacterSheetListLambda.name}`,
    retentionInDays: 14, // or your preferred retention
  });

  const loadCharacterSheetListMethod = new aws.apigateway.Method(
    `${resourcePrefix}-get-list-method`,
    {
      restApi: apiId,
      resourceId: listResource.id,
      httpMethod: "GET",
      authorization: "NONE",
    }
  );

  const loadCharacterSheetListIntegration = new aws.apigateway.Integration(
    `${resourcePrefix}-get-list-integration`,
    {
      restApi: apiId,
      resourceId: listResource.id,
      httpMethod: loadCharacterSheetListMethod.httpMethod,
      integrationHttpMethod: "POST",
      type: "AWS_PROXY",
      uri: loadCharacterSheetListLambda.invokeArn,
    },
    { dependsOn: [loadCharacterSheetListMethod] }
  );

  new aws.apigateway.MethodResponse(
    `${resourcePrefix}-get-list-method-response`,
    {
      restApi: apiId,
      resourceId: listResource.id,
      httpMethod: loadCharacterSheetListMethod.httpMethod,
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
    { dependsOn: [loadCharacterSheetListMethod] }
  );

  new aws.apigateway.IntegrationResponse(
    `${resourcePrefix}-get-list-integration-response`,
    {
      restApi: apiId,
      resourceId: listResource.id,
      httpMethod: loadCharacterSheetListMethod.httpMethod,
      statusCode: "200",
      responseParameters: {
        "method.response.header.Access-Control-Allow-Headers":
          "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        "method.response.header.Access-Control-Allow-Methods": "'GET'",
        "method.response.header.Access-Control-Allow-Origin": "'*'",
      },
    },
    {
      dependsOn: [loadCharacterSheetListIntegration],
    }
  );

  const accountId = aws.getCallerIdentity().then((id) => id.accountId);
  const region = aws.config.region;
  const apiGatewayArn = pulumi.interpolate`arn:aws:execute-api:${region}:${accountId}:${apiId}/*/*/*`;

  // Grant API Gateway permission to invoke the Lambda
  new aws.lambda.Permission(`${resourcePrefix}-get-list-gateway-permission`, {
    action: "lambda:InvokeFunction",
    function: loadCharacterSheetListLambda.name,
    principal: "apigateway.amazonaws.com",
    sourceArn: apiGatewayArn,
  });

  return {
    loadCharacterSheetListMethod: loadCharacterSheetListMethod,
    loadCharacterSheetListIntegration: loadCharacterSheetListIntegration,
  };
}
