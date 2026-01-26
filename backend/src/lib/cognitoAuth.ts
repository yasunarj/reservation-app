import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand, // ログインして
  SignUpCommand, // 登録して
  ConfirmSignUpCommand, // 確認コードを送って
  RespondToAuthChallengeCommand,
  ResendConfirmationCodeCommand, // チャレンジに答えて
} from "@aws-sdk/client-cognito-identity-provider";

const region = process.env.AWS_REGION; // どのリージョンのCognitoか
const clientId = process.env.COGNITO_CLIENT_ID; // どのアプリ用のクライアントか

if (!region) throw new Error("AWS_REGION is required");
if (!clientId) throw new Error("COGNITO_CLIENT_ID is required");

const cip = new CognitoIdentityProviderClient({ region }); // Cognitoと通信する窓口の作成コード

// ここはログインAPIで呼ばれる
export const cognitoLogin = async (email: string, password: string) => {
  // このメールアドレスとパスワードでログインしたいというコード ↓
  const out = await cip.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    }),
  );

  if (out.ChallengeName) {
    return {
      kind: "challenge" as const,
      challengeName: out.ChallengeName,
      session: out.Session ?? null,
    };
  }

  const ar = out.AuthenticationResult;
  if (!ar?.AccessToken || !ar?.RefreshToken) {
    throw new Error("missing tokens from cognito");
  }

  return {
    kind: "success" as const,
    accessToken: ar.AccessToken,
    refreshToken: ar.RefreshToken,
    idToken: ar.IdToken ?? null,
    expiresIn: ar.ExpiresIn ?? null,
  };
};

// サインアップの関数 ↓
export const cognitoSignUp = async (email: string, password: string) => {
  const out = await cip.send(
    new SignUpCommand({
      ClientId: clientId,
      Username: email,
      Password: password,
    }),
  );
  return out;
};

export const cognitoConfirmSignUp = async (email: string, code: string) => {
  const out = await cip.send(
    new ConfirmSignUpCommand({
      ClientId: clientId,
      Username: email,
      ConfirmationCode: code,
    }),
  );
  return out;
};

export const cognitoResendConfirmationCode = async (email: string) => {
  const out = await cip.send(
    new ResendConfirmationCodeCommand({
      ClientId: clientId,
      Username: email,
    }),
  );
  return out;
};

export const cognitoRefresh = async (refreshToken: string) => {
  const out = await cip.send(
    new InitiateAuthCommand({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: clientId,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    }),
  );

  const ar = out.AuthenticationResult;
  if (!ar?.AccessToken) {
    throw new Error("missing access token from refresh");
  }

  return {
    accessToken: ar.AccessToken,
    idToken: ar.IdToken ?? null,
    expiresIn: ar.ExpiresIn ?? null,
  };
};
