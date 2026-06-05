import type { User } from './user';

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface SignupResponse {
  userId: number;
  email: string;
}

export interface AccessTokenResponse {
  accessToken: string;
}

export interface TermsAgreementInput {
  service: boolean;
  privacy: boolean;
  marketing: boolean;
}

export interface SignupRequest {
  email: string;
  password: string;
  nickname: string;
  recaptchaToken: string;
  termsAgreement: TermsAgreementInput;
}
