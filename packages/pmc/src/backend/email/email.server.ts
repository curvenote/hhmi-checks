import type { Context } from '@curvenote/scms-core';
import { error401, error405 } from '@curvenote/scms-core';

export function authThrowOnInvalidCredentials(ctx: Context) {
  const { username: cfgUsername, password: cfgPassword } =
    ctx.$config.app.extensions?.pmc?.inboundEmail ?? {};
  const missingConfig = !cfgUsername || !cfgPassword;
  if (missingConfig) {
    console.log('504 - Missing configuration');
    throw error405();
  }

  const authHeader = ctx.request.headers.get('Authorization');
  console.log('authHeader', authHeader);
  if (!authHeader) {
    console.log('401 - No authorization header');
    throw error401();
  }

  // TODO: Basic authentication for cloudmailin email hook
  const [scheme, credentials] = authHeader.split(' ');
  if (scheme !== 'Basic') {
    console.log('401 - Invalid authorization scheme');
    throw error401();
  }
  const [username, password] = Buffer.from(credentials, 'base64').toString().split(':');
  if (username !== cfgUsername) {
    console.log('401 - Invalid username');
    throw error401();
  }
  if (password !== cfgPassword) {
    console.log('401 - Invalid password');
    throw error401();
  }

  return true;
}
