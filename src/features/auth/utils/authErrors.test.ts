import { describe, it, expect } from 'vitest';
import { classifyAuthError, isDefinitiveAuthError } from './authErrors';

/*
  The asymmetry is the point, so it is asserted in both directions rather than
  by a list of happy cases. Misclassifying a definitive error costs one wasted
  refresh per page load. Misclassifying a transient one costs the player their
  account — and, until `linkAnonymous` learns to re-claim, every puzzle they
  solve afterwards.
*/
describe('classifyAuthError', () => {
  it('treats Cognito grant rejections as definitive', () => {
    expect(classifyAuthError({ name: 'NotAuthorizedException' })).toBe('definitive');
    expect(classifyAuthError({ name: 'UserNotFoundException' })).toBe('definitive');
    expect(classifyAuthError({ name: 'TokenRevokedException' })).toBe('definitive');
  });

  it('reads the OAuth token endpoint verdict out of a wrapped message', () => {
    // Amplify wraps some hosted-UI failures in a plain Error, so `name` is just
    // 'Error' and the only evidence is in the message. Without the message
    // fallback these would be retried for ever against a dead grant.
    const wrapped = new Error('Request failed: invalid_grant');
    expect(classifyAuthError(wrapped)).toBe('definitive');
  });

  it('treats network and server failures as transient', () => {
    expect(classifyAuthError(new TypeError('Failed to fetch'))).toBe('transient');
    expect(classifyAuthError({ name: 'NetworkError' })).toBe('transient');
    expect(classifyAuthError({ name: 'TooManyRequestsException' })).toBe('transient');
    expect(classifyAuthError({ name: 'InternalErrorException' })).toBe('transient');
  });

  it('defaults to transient for anything unrecognised, including null', () => {
    // The default direction is a deliberate safety choice: an unknown failure
    // must not be allowed to destroy a refresh token.
    expect(classifyAuthError(null)).toBe('transient');
    expect(classifyAuthError(undefined)).toBe('transient');
    expect(classifyAuthError('something odd')).toBe('transient');
    expect(classifyAuthError({})).toBe('transient');
  });

  it('only a definitive error may destroy the grant', () => {
    expect(isDefinitiveAuthError({ name: 'NotAuthorizedException' })).toBe(true);
    expect(isDefinitiveAuthError(new TypeError('Failed to fetch'))).toBe(false);
  });
});
