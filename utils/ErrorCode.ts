export enum ErrorCode {
  IncorrectUsernamePassword = 'incorrect-username-password',
  UserNotFound = 'user-not-found',
  IncorrectPassword = 'incorrect-password',
  UserMissingPassword = 'missing-password',
  TwoFactorDisabled = 'two-factor-disabled',
  TwoFactorAlreadyEnabled = 'two-factor-already-enabled',
  TwoFactorSetupRequired = 'two-factor-setup-required',
  SecondFactorRequired = 'second-factor-required',
  SecondFactorRequest = 'second-factor-request',
  RecoveryCodeRequired = 'recovery-code-required',
  IncorrectTwoFactorCode = 'incorrect-two-factor-code',
  IncorrectRecoveryCode = 'incorrect-recovery-code',
  InternalServerError = 'internal-server-error',
  NewPasswordMatchesOld = 'new-password-matches-old',
  ThirdPartyIdentityProviderEnabled = 'third-party-identity-provider-enabled',
  CredentialsSignin = 'CredentialsSignin',
  IsBot = 'is-bot',
  UserNotActive = 'user-not-active',
  OTPRequest = 'otp-request',
  OTPRequired = 'otp-required',
  IncorrectOTPCode = 'incorrect-otp-code',
}
