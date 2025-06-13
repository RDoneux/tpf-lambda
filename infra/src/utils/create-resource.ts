import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { ResourceArgs } from "../interfaces/resource";
import { addCorsOptions } from "./cors";

const config = new pulumi.Config();
const projectName = config.require("projectname");
const serviceName = config.require("servicename");
const resourcePrefix = `${projectName}-${serviceName}`;

export function createResource(
  name: string,
  resourceArgs: ResourceArgs
): pulumi.Output<string> {
  const { restApi, parentId } = resourceArgs;

  // Create a new API Gateway resource
  const apiResource = new aws.apigateway.Resource(
    `${resourcePrefix}-${name}-resource`,
    {
      restApi,
      parentId,
      pathPart: name,
    }
  );

  addCorsOptions(resourcePrefix, restApi, apiResource.id, name);

  return apiResource.id;
}
