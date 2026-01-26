import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const region = process.env.AWS_REGION;
const jwksUrl = process.env.COGNITO_JWKS_URL;
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID;

if (!region) throw new Error("AWS_REGION is required");
if (!clientId) throw new Error("COGNITO_CLIENT_ID is required");
if (!userPoolId) throw new Error("COGNITO_USER_POOL_ID is required");

const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
const resolvedJwks =
  jwksUrl ??
  `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;

const JWKS = createRemoteJWKSet(new URL(resolvedJwks));

export type CognitoUser = {
  id: string; // sub
  email?: string | null;
};

const getTokenFromAuthHeader = (authHeader?: string | null): string | null => {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
};

export const verifyCognitoAccessToken = async (
  token: string,
): Promise<{ payload: JWTPayload; user: CognitoUser }> => {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer,
  });

  // Cognito固有:token_useを必ず見る(access 以外は弾く)
  const tokenUse = (payload as any).token_use;
  if (tokenUse !== "access") {
    throw new Error("invalid token_use (access required)");
  }

  // access token では audience が入らず client_id のことが多い
  const tokenClientId = (payload as any).client_id;
  if (tokenClientId !== clientId) {
    throw new Error("invalid client_id");
  }

  const sub = payload.sub;
  if (!sub) throw new Error("token has no sub");

  const email =
    typeof (payload as any).email === "string" ? (payload as any).email : null;

  return { payload, user: { id: sub, email } };
};

export { getTokenFromAuthHeader };
