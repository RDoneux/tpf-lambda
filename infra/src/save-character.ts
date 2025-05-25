import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { LambdaGatewayArgs } from "./interfaces/lambda";

export function saveCharacter({
  resourcePrefix,
  bucketName,
  bucketArn,
  apiId,
  resourceId,
}: LambdaGatewayArgs) {
  // Create an IAM role for the Lambda function
  const lambdaRole = new aws.iam.Role(`${resourcePrefix}-post-role`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: "lambda.amazonaws.com",
    }),
  });

  // Attach the AWSLambdaBasicExecutionRole and S3 permissions to the role
  new aws.iam.RolePolicyAttachment(`${resourcePrefix}-post-basic-execution`, {
    role: lambdaRole.name,
    policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
  });

  new aws.iam.RolePolicy(`${resourcePrefix}-post-s3-policy`, {
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

  // Create the Lambda function
  const saveCharacterSheetLambda = new aws.lambda.Function(
    `${resourcePrefix}-post-function`,
    {
      runtime: "nodejs22.x",
      code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("../dist/save-character-sheet"),
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

  new aws.cloudwatch.LogGroup(`${resourcePrefix}-post-log-group`, {
    name: pulumi.interpolate`/aws/lambda/${saveCharacterSheetLambda.name}`,
    retentionInDays: 14, // or your preferred retention
  });

  // SAVE CHARACTER SHEET
  const saveCharacterSheetMethod = new aws.apigateway.Method(
    `${resourcePrefix}-post-method`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: "POST",
      authorization: "NONE",
    }
  );

  // Integrate the method with Lambda
  const saveCharacterSheetIntegration = new aws.apigateway.Integration(
    `${resourcePrefix}-post-integration`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: saveCharacterSheetMethod.httpMethod,
      integrationHttpMethod: "POST",
      type: "AWS_PROXY",
      uri: saveCharacterSheetLambda.invokeArn,
    },
    { dependsOn: [saveCharacterSheetMethod] }
  );

  new aws.apigateway.MethodResponse(
    `${resourcePrefix}-post-method-response`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: saveCharacterSheetMethod.httpMethod,
      statusCode: "200",
      responseParameters: {
        "method.response.header.Access-Control-Allow-Origin": true,
        "method.response.header.Access-Control-Allow-Headers": true,
        "method.response.header.Access-Control-Allow-Methods": true,
      },
      responseModels: {
        "application/json": "Empty",
      },
    },
    { dependsOn: [saveCharacterSheetMethod] }
  );

  new aws.apigateway.IntegrationResponse(
    `${resourcePrefix}-post-integration-response`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: saveCharacterSheetMethod.httpMethod,
      statusCode: "200",
      responseParameters: {
        "method.response.header.Access-Control-Allow-Headers":
          "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        "method.response.header.Access-Control-Allow-Methods": "'POST'",
        "method.response.header.Access-Control-Allow-Origin": "'*'",
      },
    },
    { dependsOn: [saveCharacterSheetIntegration] }
  );

  const accountId = aws.getCallerIdentity().then((id) => id.accountId);
  const region = aws.config.region;
  const apiGatewayArn = pulumi.interpolate`arn:aws:execute-api:${region}:${accountId}:${apiId}/*/*/*`;

  // Grant API Gateway permission to invoke the Lambda
  new aws.lambda.Permission(`${resourcePrefix}-post-gateway-permission`, {
    action: "lambda:InvokeFunction",
    function: saveCharacterSheetLambda.name,
    principal: "apigateway.amazonaws.com",
    sourceArn: apiGatewayArn,
  });

  return { saveCharacterSheetMethod, saveCharacterSheetIntegration };
}
