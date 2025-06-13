import * as aws from "@pulumi/aws";
import { LambdaGatewayArgs, LambdaReturnArgs } from "../interfaces/lambda";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const projectName = config.require("projectname");
const serviceName = config.require("servicename");
const resourcePrefix = `${projectName}-${serviceName}`;

export function createLambda(
  name: string,
  gatewayArgs: LambdaGatewayArgs
): LambdaReturnArgs {
  const {
    bucketArn,
    restApi,
    resourceId,
    pathToDist,
    bucketName,
    s3PolicyActions,
    httpMethod,
  } = gatewayArgs;

  // Create an IAM role for the Lambda function
  const lambdaRole = new aws.iam.Role(`${resourcePrefix}-${name}-role`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: "lambda.amazonaws.com",
    }),
  });

  // Attach the AWSLambdaBasicExecutionRole and S3 permissions to the role
  new aws.iam.RolePolicyAttachment(`${resourcePrefix}-${name}-execution`, {
    role: lambdaRole.name,
    policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
  });

  new aws.iam.RolePolicy(`${resourcePrefix}-${name}-s3-policy`, {
    role: lambdaRole.id,
    policy: bucketArn.apply((arn) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: s3PolicyActions,
            Resource: [arn, `${arn}/*`],
          },
        ],
      })
    ),
  });

  const lambdaFunction = new aws.lambda.Function(
    `${resourcePrefix}-${name}-function`,
    {
      runtime: "nodejs22.x",
      code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive(pathToDist),
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

  new aws.cloudwatch.LogGroup(`${resourcePrefix}-${name}-log-group`, {
    name: pulumi.interpolate`/aws/lambda/${lambdaFunction.name}`,
    retentionInDays: 14,
  });

  const method = new aws.apigateway.Method(`${resourcePrefix}-${name}-method`, {
    restApi,
    resourceId,
    httpMethod,
    authorization: "NONE",
  });

  const integration = new aws.apigateway.Integration(
    `${resourcePrefix}-${name}-integration`,
    {
      restApi,
      resourceId,
      httpMethod: method.httpMethod,
      integrationHttpMethod: "POST",
      type: "AWS_PROXY",
      uri: lambdaFunction.invokeArn,
    },
    { dependsOn: [method] }
  );

  new aws.apigateway.MethodResponse(
    `${resourcePrefix}-${name}-method-response`,
    {
      restApi,
      resourceId,
      httpMethod: method.httpMethod,
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
    { dependsOn: [method] }
  );

  new aws.apigateway.IntegrationResponse(
    `${resourcePrefix}-${name}-integration-response`,
    {
      restApi,
      resourceId,
      httpMethod: method.httpMethod,
      statusCode: "200",
      responseParameters: {
        "method.response.header.Access-Control-Allow-Headers":
          "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        "method.response.header.Access-Control-Allow-Methods": `'${httpMethod},OPTIONS'`,
        "method.response.header.Access-Control-Allow-Origin": "'*'",
      },
    },
    { dependsOn: [integration] }
  );

  const accountId = aws.getCallerIdentity().then((id) => id.accountId);
  const region = aws.config.region;
  const apiGatewayArn = pulumi.interpolate`arn:aws:execute-api:${region}:${accountId}:${restApi}/*/*/*`;

  new aws.lambda.Permission(`${resourcePrefix}-${name}-gateway-permission`, {
    action: "lambda:InvokeFunction",
    function: lambdaFunction.name,
    principal: "apigateway.amazonaws.com",
    sourceArn: apiGatewayArn,
  });

  return [method, integration ];
}
