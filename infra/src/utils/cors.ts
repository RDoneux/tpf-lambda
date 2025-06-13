import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function addCorsOptions(
  resourcePrefix: string,
  apiId: pulumi.Input<string>,
  resourceId: pulumi.Input<string>,
  name: string
) {
  const optionsMethod = new aws.apigateway.Method(
    `${resourcePrefix}-options-method-${name}`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: "OPTIONS",
      authorization: "NONE",
    }
  );

  const optionsMockIntegration = new aws.apigateway.Integration(
    `${resourcePrefix}-options-mock-integration-${name}`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: "OPTIONS",
      type: "MOCK",
      requestTemplates: {
        "application/json": '{"statusCode": 200}',
      },
    },
    { dependsOn: [optionsMethod] }
  );

  new aws.apigateway.MethodResponse(
    `${resourcePrefix}-options-method-response-${name}`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: "OPTIONS",
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
    { dependsOn: [optionsMethod] }
  );

  new aws.apigateway.IntegrationResponse(
    `${resourcePrefix}-options-integration-response-${name}`,
    {
      restApi: apiId,
      resourceId: resourceId,
      httpMethod: "OPTIONS",
      statusCode: "200",
      responseParameters: {
        "method.response.header.Access-Control-Allow-Origin": "'*'",
        "method.response.header.Access-Control-Allow-Methods": "'OPTIONS'",
        "method.response.header.Access-Control-Allow-Headers":
          "'content-type,Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
      },
      responseTemplates: {
        "application/json": "",
      },
    },
    { dependsOn: [optionsMockIntegration] }
  );

  return { optionsMethod, optionsMockIntegration };
}
