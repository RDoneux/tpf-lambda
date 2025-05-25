import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface LambdaGatewayArgs {
  resourcePrefix: string;
  bucketName: pulumi.Output<string>;
  bucketArn: pulumi.Output<string>;
  apiId: pulumi.Output<string>;
  resourceId: pulumi.Output<string>;
}
