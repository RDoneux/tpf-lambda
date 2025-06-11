import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { LambdaGatewayArgs } from "../interfaces/lambda";

export function createCamp({
  resourcePrefix,
  bucketName,
  bucketArn,
  apiId,
  resourceId,
}: LambdaGatewayArgs) {
  const createResource = new aws.apigateway.Resource(
    `${resourcePrefix}-camp-create-resource`,
    {
      restApi: apiId,
      parentId: resourceId,
      pathPart: "create",
    }
  );

  // Create an IAM role for the Lambda function
  const lambdaRole = new aws.iam.Role(`${resourcePrefix}-camp-create-role`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: "lambda.amazonaws.com",
    }),
  });

  // Attach the AWSLambdaBasicExecutionRole and S3 permissions to the role
  new aws.iam.RolePolicyAttachment(`${resourcePrefix}-camp-create-execution`, {
    role: lambdaRole.name,
    policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
  });

  new aws.iam.RolePolicy(`${resourcePrefix}-camp-create-s3-policy`, {
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
  const createCampLambda = new aws.lambda.Function(
    `${resourcePrefix}-camp-create-function`,
    {
      runtime: "nodejs22.x",
      code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("../dist/camp/create-camp"),
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

  new aws.cloudwatch.LogGroup(`${resourcePrefix}-camp-create-log-group`, {
    name: pulumi.interpolate`/aws/lambda/${createCampLambda.name}`,
    retentionInDays: 14, // or your preferred retention
  });

  // SAVE CHARACTER SHEET
  const createCampMethod = new aws.apigateway.Method(
    `${resourcePrefix}-camp-create-method`,
    {
      restApi: apiId,
      resourceId: createResource.id,
      httpMethod: "POST",
      authorization: "NONE",
    }
  );

  // Integrate the method with Lambda
  const createCampIntegration = new aws.apigateway.Integration(
    `${resourcePrefix}-camp-create-integration`,
    {
      restApi: apiId,
      resourceId: createResource.id,
      httpMethod: createCampMethod.httpMethod,
      integrationHttpMethod: "POST",
      type: "AWS_PROXY",
      uri: createCampLambda.invokeArn,
    },
    { dependsOn: [createCampMethod] }
  );

  new aws.apigateway.MethodResponse(
    `${resourcePrefix}-camp-create-method-response`,
    {
      restApi: apiId,
      resourceId: createResource.id,
      httpMethod: createCampMethod.httpMethod,
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
    { dependsOn: [createCampMethod] }
  );

  new aws.apigateway.IntegrationResponse(
    `${resourcePrefix}-camp-create-integration-response`,
    {
      restApi: apiId,
      resourceId: createResource.id,
      httpMethod: createCampMethod.httpMethod,
      statusCode: "200",
      responseParameters: {
        "method.response.header.Access-Control-Allow-Headers":
          "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        "method.response.header.Access-Control-Allow-Methods": "'POST'",
        "method.response.header.Access-Control-Allow-Origin": "'*'",
      },
    },
    { dependsOn: [createCampIntegration] }
  );

  const accountId = aws.getCallerIdentity().then((id) => id.accountId);
  const region = aws.config.region;
  const apiGatewayArn = pulumi.interpolate`arn:aws:execute-api:${region}:${accountId}:${apiId}/*/*/*`;

  // Grant API Gateway permission to invoke the Lambda
  new aws.lambda.Permission(
    `${resourcePrefix}-camp-create-gateway-permission`,
    {
      action: "lambda:InvokeFunction",
      function: createCampLambda.name,
      principal: "apigateway.amazonaws.com",
      sourceArn: apiGatewayArn,
    }
  );

  return { createCampMethod, createCampIntegration };
}
