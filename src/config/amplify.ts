import { Amplify } from 'aws-amplify';

import env from './env';

/*
  Identity and redirect URIs come from `config/env.ts` (#34).

  They used to be inline here, with the client id and hosted-UI domain duplicated
  in `features/auth/utils/oauth.ts` - and the redirect base was
  `import.meta.env.DEV ? 'http://localhost:8080' : 'https://www.chessplaybook.com'`,
  which is a hard blocker for any non-production build: **DEV is false in every
  production-mode build**, so a staging bundle would have sent users to the live
  site to sign in.
*/
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: env.cognitoUserPoolId,
      userPoolClientId: env.cognitoClientId,
      loginWith: {
        oauth: {
          domain: env.cognitoDomain,
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: [`${env.siteUrl}/auth/callback`],
          redirectSignOut: [`${env.siteUrl}/`],
          responseType: 'code',
        },
      },
    },
  },
});
