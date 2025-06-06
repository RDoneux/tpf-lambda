import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { saveCharacter } from "./src/save-character";
import { loadCharacter } from "./src/load-character";
import { loadCharacterList } from "./src/load-character-list";
import { searchSpell } from "./src/search-spell";
import { searchMonster } from "./src/search-monster";
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

const characterResource = new aws.apigateway.Resource(
  `${resourcePrefix}-character-resource`,
  {
    restApi: apiId,
    parentId: rootResourceId,
    pathPart: "character",
  }
);

const spellsResource = new aws.apigateway.Resource(
  `${resourcePrefix}-spells-resource`,
  {
    restApi: apiId,
    parentId: rootResourceId,
    pathPart: "spells",
  }
);

const monstersResource = new aws.apigateway.Resource(
  `${resourcePrefix}-monsters-resource`,
  {
    restApi: apiId,
    parentId: rootResourceId,
    pathPart: "monsters",
  }
);

const { optionsMethod, optionsMockIntegration } = addCorsOptions(
  resourcePrefix,
  apiId,
  characterResource.id
);

const { saveCharacterSheetMethod, saveCharacterSheetIntegration } =
  saveCharacter({
    resourcePrefix,
    bucketArn,
    bucketName,
    apiId,
    resourceId: characterResource.id,
  });

const { loadCharacterSheetMethod, loadCharacterSheetIntegration } =
  loadCharacter({
    resourcePrefix,
    bucketArn,
    bucketName,
    apiId,
    resourceId: characterResource.id,
  });

const { loadCharacterSheetListMethod, loadCharacterSheetListIntegration } =
  loadCharacterList({
    resourcePrefix,
    bucketArn,
    bucketName,
    apiId,
    resourceId: characterResource.id,
  });

const { searchSpellMethod, searchSpellIntegration } = searchSpell({
  resourcePrefix,
  bucketArn,
  bucketName,
  apiId,
  resourceId: spellsResource.id,
});

const { searchMonsterMethod, searchMonsterIntegration } = searchMonster({
  resourcePrefix,
  bucketArn,
  bucketName,
  apiId,
  resourceId: monstersResource.id,
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
      loadCharacterSheetListIntegration,
      loadCharacterSheetListMethod,
      searchSpellIntegration,
      searchSpellMethod,
      searchMonsterIntegration,
      searchMonsterMethod,
      optionsMethod,
      optionsMockIntegration,
    ],
  }
);
