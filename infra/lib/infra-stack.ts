//このinfra-stack.tsファイルはVPC(ネットワークの箱)を作って,あとでRDS/Lambdaを安全に置ける土台を作っている
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs"; //ConstructはAWS内のそれぞれの機能でありそれぞれが共通の方を持っている
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";

export class InfraStack extends cdk.Stack {
  //InfraStackはAWSを扱う大枠(箱)という意味
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "ReservationVpc", {
      vpcName: "reservation-vpc",
      maxAzs: 2, //２つのAZを使う
      natGateways: 1, //Private subnetから外に出るための出口
      subnetConfiguration: [
        {
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          name: "private-egress",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // =========================
    // RDS 追加ここから
    // =========================

    // DB用 Security Group
    const dbSg = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc,
      description: "Security group for RDS",
      allowAllOutbound: true,
    });

    // 認証情報 (Secrets Manager)
    const dbCredentials = rds.Credentials.fromGeneratedSecret("postgres");

    // RDS インスタンス
    const db = new rds.DatabaseInstance(this, "ReservationDb", {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [dbSg],
      publiclyAccessible: false,

      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),

      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
      ),

      credentials: dbCredentials,
      databaseName: "reservation",

      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      backupRetention: cdk.Duration.days(0),

      // 学習用設定
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deleteAutomatedBackups: true,
    });

    const lambdaSg = new ec2.SecurityGroup(this, "LambdaSecurityGroup", {
      vpc,
      description: "Security group for Lambda",
      allowAllOutbound: true,
    });

    dbSg.addIngressRule(
      lambdaSg,
      ec2.Port.tcp(5432),
      "Allow Lambda to access Postgres"
    );

    const db_check_lambda = new lambda.Function(this, "HelloLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lambda"),

      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSg],
      environment: {
        DB_HOST: db.dbInstanceEndpointAddress,
        DB_PORT: db.dbInstanceEndpointPort,
        DB_SECRET_NAME: db.secret!.secretName,
      },
    });

    db_check_lambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    // Secrets ManagerからDB 認証情報を読む権限を付与
    db.secret?.grantRead(db_check_lambda);

    new cdk.CfnOutput(this, "VpcId", { value: vpc.vpcId });
    new cdk.CfnOutput(this, "DbEndpoint", {
      value: db.dbInstanceEndpointAddress,
    });
    new cdk.CfnOutput(this, "DbPort", {
      value: db.dbInstanceEndpointPort,
    });
    new cdk.CfnOutput(this, "DbSecretName", {
      value: db.secret?.secretName ?? "no-secret",
    });
    new cdk.CfnOutput(this, "LambdaSgId", { value: lambdaSg.securityGroupId });
    new cdk.CfnOutput(this, "DbSgId", { value: dbSg.securityGroupId });
    new cdk.CfnOutput(this, "LambdaName", {
      value: db_check_lambda.functionName,
    });
  }
}

// VPCの中にRDSとLambdaを置いて、Security Groupで5432だけ通し、パスワードはSecrets ManagerからLambdaが読む
// CDK：AWSに「箱・鍵・通路」を作るだけ

// Lambda：実行されるのは Test / API 呼び出し時

// Secrets Manager：パスワードの金庫

// RDS：private subnet 内の金庫

// SecurityGroup：誰がどこに入れるかの門番

// NAT：AWS外に出るときの出口