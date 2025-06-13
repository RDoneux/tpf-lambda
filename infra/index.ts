import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { saveCharacter } from "./src/save-character";
import { loadCharacter } from "./src/load-character";
import { loadCharacterList } from "./src/load-character-list";
import { searchSpell } from "./src/search-spell";
import { searchMonster } from "./src/search-monster";
import { createCamp } from "./src/camp/create-camp";
import { getCampDetails } from "./src/camp/get-camp-details";
import { createResource } from "./src/utils/create-resource";

const infrastructureStack = new pulumi.StackReference(
  "organization/tpf-infrastructure/dev"
);
const restApi: pulumi.Output<string> = infrastructureStack.getOutput(
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

// CREATE API RESOURCES
const characterResourceId = createResource("character", {
  restApi,
  parentId: rootResourceId,
});

const characterListResourceId = createResource("list", {
  restApi,
  parentId: characterResourceId,
});

const spellResourceId = createResource("spells", {
  restApi,
  parentId: rootResourceId,
});

const monsterResourceId = createResource("monsters", {
  restApi,
  parentId: rootResourceId,
});

const campResourceId = createResource("camp", {
  restApi,
  parentId: rootResourceId,
});

// CREATE LAMBDA FUNCTIONS
const commonLambdaArgs = { bucketArn, bucketName, restApi };
const saveCharacterLambdaArgs = saveCharacter({
  ...commonLambdaArgs,
  resourceId: characterResourceId,
});

const loadCharacterLambdaArgs = loadCharacter({
  ...commonLambdaArgs,
  resourceId: characterResourceId,
});

const loadCharacterListLambaArgs = loadCharacterList({
  ...commonLambdaArgs,
  resourceId: characterListResourceId,
});

const searchSpellLambdaArgs = searchSpell({
  ...commonLambdaArgs,
  resourceId: spellResourceId,
});

const searchMonsterLambdaArgs = searchMonster({
  ...commonLambdaArgs,
  resourceId: monsterResourceId,
});

const createCampLambdaArgs = createCamp({
  ...commonLambdaArgs,
  resourceId: campResourceId,
});

const createGetCampDetailsLambdaArgs = getCampDetails({
  ...commonLambdaArgs,
  resourceId: campResourceId,
});

// DEPOLOYMENT
const deployment = new aws.apigateway.Deployment(
  `${resourcePrefix}-deployment`,
  {
    restApi,
    description: `Deployment on ${new Date().toISOString()}`,
  },
  {
    dependsOn: [
      ...saveCharacterLambdaArgs,
      ...loadCharacterLambdaArgs,
      ...loadCharacterListLambaArgs,
      ...searchSpellLambdaArgs,
      ...searchMonsterLambdaArgs,
      ...createCampLambdaArgs,
      ...createGetCampDetailsLambdaArgs
    ],
  }
);

new aws.apigateway.Stage(`${resourcePrefix}-api-stage`, {
  restApi,
  stageName: "dev",
  deployment: deployment.id,
});
