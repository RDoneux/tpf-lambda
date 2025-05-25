import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { saveCharacter } from "./src/save-character";
import { loadCharacter } from "./src/load-character";
import { addCorsOptions } from "./src/utils/cors";

const infrastructureStack = new pulumi.StackReference(
  "organization/tpf-infrastructure/dev"
);
const apiId: pulumi.Output<string> = infrastructureStack.getOutput(
  "apiId"
) as pulumi.Output<string>;
const rootResourceId: pulumi.Output<string> = infrastructureStack.getOutput(
  "apiRootResourceId"
) as pulumi.Output<string>;
const bucketArn: pulumi.Output<string> = infrastructureStack.getOutput(
  "bucketArn"
) as pulumi.Output<string>;
const bucketName: pulumi.Output<string> = infrastructureStack.getOutput(
  "bucketName"
) as pulumi.Output<string>;

const config = new pulumi.Config();
const projectName = config.require("projectname");
const serviceName = config.require("servicename");
const resourcePrefix = `${projectName}-${serviceName}`;

// Create an AWS resource (S3 Bucket)
// const bucket = new aws.s3.BucketV2(`${resourcePrefix}-backup`);

const resource = new aws.apigateway.Resource(
  `${resourcePrefix}-character-resource`,
  {
    restApi: apiId,
    parentId: rootResourceId,
    pathPart: "character",
  }
);

const { optionsMethod, optionsMockIntegration } = addCorsOptions(
  resourcePrefix,
  apiId,
  resource.id
);

const { saveCharacterSheetMethod, saveCharacterSheetIntegration } =
  saveCharacter({
    resourcePrefix,
    bucketArn,
    bucketName,
    apiId,
    resourceId: resource.id,
  });

const { loadCharacterSheetMethod, loadCharacterSheetIntegration } =
  loadCharacter({
    resourcePrefix,
    bucketArn,
    bucketName,
    apiId,
    resourceId: resource.id,
  });

new aws.apigateway.Deployment(
  `${resourcePrefix}-deployment`,
  {
    restApi: apiId,
  },
  {
    dependsOn: [
      saveCharacterSheetIntegration,
      saveCharacterSheetMethod,
      loadCharacterSheetIntegration,
      loadCharacterSheetMethod,
      optionsMethod,
      optionsMockIntegration,
    ],
  }
);
