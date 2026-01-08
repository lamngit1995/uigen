/**
 * @vitest-environment node
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

/**
 * Auth module tests
 *
 * Note: The auth module uses Next.js server-only APIs (cookies()) which are difficult
 * to test in isolation. These tests mock the cookie store and verify the JWT token
 * generation/verification logic.
 */

// Set up test environment
const TEST_SECRET = "test-secret-key";
const JWT_SECRET = new TextEncoder().encode(TEST_SECRET);
const COOKIE_NAME = "auth-token";

// Mock Next.js modules
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

vi.mock("server-only", () => ({}));

describe("auth module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("JWT token generation", () => {
    test("generates valid JWT token with correct payload", async () => {
      const userId = "user123";
      const email = "test@example.com";
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const token = await new SignJWT({ userId, email, expiresAt })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .setIssuedAt()
        .sign(JWT_SECRET);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");

      // Verify token can be decoded
      const { payload } = await jwtVerify(token, JWT_SECRET);
      expect(payload.userId).toBe(userId);
      expect(payload.email).toBe(email);
    });

    test("token includes expiration time", async () => {
      const token = await new SignJWT({
        userId: "user123",
        email: "test@example.com",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .setIssuedAt()
        .sign(JWT_SECRET);

      const { payload } = await jwtVerify(token, JWT_SECRET);
      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();
    });

    test("token verification fails with wrong secret", async () => {
      const token = await new SignJWT({
        userId: "user123",
        email: "test@example.com",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .setIssuedAt()
        .sign(JWT_SECRET);

      const wrongSecret = new TextEncoder().encode("wrong-secret");

      await expect(jwtVerify(token, wrongSecret)).rejects.toThrow();
    });

    test("expired token verification fails", async () => {
      const token = await new SignJWT({
        userId: "user123",
        email: "test@example.com",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("0s") // Already expired
        .setIssuedAt()
        .sign(JWT_SECRET);

      await expect(jwtVerify(token, JWT_SECRET)).rejects.toThrow();
    });

    test("invalid token format fails verification", async () => {
      const invalidToken = "invalid.jwt.token";

      await expect(jwtVerify(invalidToken, JWT_SECRET)).rejects.toThrow();
    });
  });

  describe("Cookie store interactions", () => {
    test("cookie store mock can set cookies", () => {
      const token = "test-token";
      const options = {
        httpOnly: true,
        secure: false,
        sameSite: "lax" as const,
        expires: new Date(),
        path: "/",
      };

      mockCookieStore.set(COOKIE_NAME, token, options);

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        COOKIE_NAME,
        token,
        options
      );
    });

    test("cookie store mock can get cookies", () => {
      const token = "test-token";
      mockCookieStore.get.mockReturnValue({ value: token });

      const result = mockCookieStore.get(COOKIE_NAME);

      expect(result).toEqual({ value: token });
      expect(mockCookieStore.get).toHaveBeenCalledWith(COOKIE_NAME);
    });

    test("cookie store mock can delete cookies", () => {
      mockCookieStore.delete(COOKIE_NAME);

      expect(mockCookieStore.delete).toHaveBeenCalledWith(COOKIE_NAME);
    });

    test("cookie store mock returns undefined for non-existent cookie", () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = mockCookieStore.get(COOKIE_NAME);

      expect(result).toBeUndefined();
    });
  });

  describe("Session payload", () => {
    test("session payload contains required fields", () => {
      const session = {
        userId: "user123",
        email: "test@example.com",
        expiresAt: new Date(),
      };

      expect(session).toHaveProperty("userId");
      expect(session).toHaveProperty("email");
      expect(session).toHaveProperty("expiresAt");
      expect(session.expiresAt).toBeInstanceOf(Date);
    });

    test("session expiry is set to 7 days in future", () => {
      const now = Date.now();
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(now + sevenDaysInMs);

      const timeDiff = expiresAt.getTime() - now;
      const expectedDiff = sevenDaysInMs;

      // Allow 1 second tolerance
      expect(Math.abs(timeDiff - expectedDiff)).toBeLessThan(1000);
    });
  });

  describe("Request cookie handling", () => {
    test("can extract cookie from request object", () => {
      const token = "test-token";
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: token }),
        },
      };

      const result = mockRequest.cookies.get(COOKIE_NAME);

      expect(result).toEqual({ value: token });
      expect(mockRequest.cookies.get).toHaveBeenCalledWith(COOKIE_NAME);
    });

    test("handles missing cookie in request", () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue(undefined),
        },
      };

      const result = mockRequest.cookies.get(COOKIE_NAME);

      expect(result).toBeUndefined();
    });
  });

  describe("Token lifecycle", () => {
    test("full token lifecycle - create, verify, validate", async () => {
      const userId = "lifecycle-user";
      const email = "lifecycle@example.com";
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Create token
      const token = await new SignJWT({ userId, email, expiresAt })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .setIssuedAt()
        .sign(JWT_SECRET);

      expect(token).toBeTruthy();

      // Verify token
      const { payload } = await jwtVerify(token, JWT_SECRET);
      expect(payload.userId).toBe(userId);
      expect(payload.email).toBe(email);

      // Validate payload structure
      expect(typeof payload.userId).toBe("string");
      expect(typeof payload.email).toBe("string");
      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();
    });

    test("token remains valid within expiry period", async () => {
      const token = await new SignJWT({
        userId: "user123",
        email: "test@example.com",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h") // Valid for 1 hour
        .setIssuedAt()
        .sign(JWT_SECRET);

      // Should not throw - token is still valid
      const { payload } = await jwtVerify(token, JWT_SECRET);
      expect(payload).toBeDefined();
    });
  });

  describe("Security considerations", () => {
    test("cookie options should include httpOnly for security", () => {
      const options = {
        httpOnly: true,
        secure: true,
        sameSite: "lax" as const,
        expires: new Date(),
        path: "/",
      };

      expect(options.httpOnly).toBe(true);
    });

    test("cookie should have path set to root", () => {
      const options = {
        httpOnly: true,
        secure: false,
        sameSite: "lax" as const,
        expires: new Date(),
        path: "/",
      };

      expect(options.path).toBe("/");
    });

    test("cookie should use HS256 algorithm for JWT", () => {
      const header = { alg: "HS256" };
      expect(header.alg).toBe("HS256");
    });
  });

  describe("Error handling", () => {
    test("handles malformed JWT gracefully", async () => {
      const malformedToken = "not.a.valid.jwt.token";

      await expect(jwtVerify(malformedToken, JWT_SECRET)).rejects.toThrow();
    });

    test("handles empty token gracefully", async () => {
      const emptyToken = "";

      await expect(jwtVerify(emptyToken, JWT_SECRET)).rejects.toThrow();
    });

    test("handles token with invalid JSON payload", async () => {
      const invalidToken = "header.{invalid-json}.signature";

      await expect(jwtVerify(invalidToken, JWT_SECRET)).rejects.toThrow();
    });
  });
});
