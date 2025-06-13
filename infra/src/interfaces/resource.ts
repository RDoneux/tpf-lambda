import * as pulumi from "@pulumi/pulumi";

export interface ResourceArgs {
    restApi: pulumi.Output<string>;
    parentId: pulumi.Output<string>;
}