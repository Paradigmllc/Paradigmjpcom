import { afterEach, describe, expect, it } from "vitest";
import { isAuthorizationHeaderValid, isProductionAuthConfigured } from "./auth";

const originalEnv = {
  admin: process.env.MEDIA_OS_ADMIN_TOKEN,
  user: process.env.MEDIA_OS_BASIC_AUTH_USER,
  password: process.env.MEDIA_OS_BASIC_AUTH_PASSWORD,
};

afterEach(() => {
  process.env.MEDIA_OS_ADMIN_TOKEN = originalEnv.admin;
  process.env.MEDIA_OS_BASIC_AUTH_USER = originalEnv.user;
  process.env.MEDIA_OS_BASIC_AUTH_PASSWORD = originalEnv.password;
});

describe("production authorization", () => {
  it("accepts the configured bearer token and rejects a near miss", () => {
    process.env.MEDIA_OS_ADMIN_TOKEN = "correct-token";
    expect(isAuthorizationHeaderValid("Bearer correct-token")).toBe(true);
    expect(isAuthorizationHeaderValid("Bearer correct-tokeN")).toBe(false);
  });

  it("accepts configured Basic credentials", () => {
    process.env.MEDIA_OS_ADMIN_TOKEN = "";
    process.env.MEDIA_OS_BASIC_AUTH_USER = "operator";
    process.env.MEDIA_OS_BASIC_AUTH_PASSWORD = "strong-password";
    const encoded = Buffer.from("operator:strong-password").toString("base64");
    expect(isProductionAuthConfigured()).toBe(true);
    expect(isAuthorizationHeaderValid(`Basic ${encoded}`)).toBe(true);
  });

  it("fails closed when credentials are absent or malformed", () => {
    process.env.MEDIA_OS_ADMIN_TOKEN = "";
    process.env.MEDIA_OS_BASIC_AUTH_USER = "";
    process.env.MEDIA_OS_BASIC_AUTH_PASSWORD = "";
    expect(isProductionAuthConfigured()).toBe(false);
    expect(isAuthorizationHeaderValid(null)).toBe(false);
    expect(isAuthorizationHeaderValid("Basic !!!")).toBe(false);
  });
});
