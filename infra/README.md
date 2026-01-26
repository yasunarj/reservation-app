# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npx cdk deploy` deploy this stack to your default AWS account/region
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template

・bin/infra.ts：CDKアプリの入口（どのStackを使うか）

・lib/infra-stack.ts：ここにAWSリソースを書く（VPC/RDS/Lambda等）

・cdk.json：CDKが何を実行するかの設定

・package.json：依存パッケージやスクリプト

・tsconfig.json：TypeScript設定
