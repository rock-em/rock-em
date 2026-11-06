import { ApiError, api, errorMessage, isJson } from "../../api/client";
import type { components } from "../../api/schema";

export type User = components["schemas"]["User"];
export type SignInInput = components["schemas"]["LoginInput"];
export type SignUpInput = components["schemas"]["RegisterInput"];

const UNAVAILABLE = "Account access is not available yet. Please try again later.";
const RESET_UNAVAILABLE = "Password reset is currently unavailable. Please try again later.";
const FAILED = "Unable to complete your request. Please try again.";

type Result = { data?: unknown; error?: unknown; response: Response };

async function send(pending: Promise<Result>, unavailable: string): Promise<Result> {
  try {
    return await pending;
  } catch (error) {
    if (error instanceof SyntaxError) throw new ApiError(unavailable, 0);
    throw new ApiError("Unable to connect. Please try again.", 0);
  }
}

function toUser({ data, error, response }: Result, messages: Record<number, string>): User {
  if (response.status === 404 || !isJson(response)) throw new ApiError(UNAVAILABLE, response.status);
  if (!response.ok) {
    const message =
      response.status === 400
        ? (errorMessage(error) ?? "Please check your account details.")
        : messages[response.status];
    throw new ApiError(message ?? FAILED, response.status, error);
  }
  const user = data as Partial<User> | undefined;
  if (typeof user?.displayName !== "string" || typeof user.email !== "string") {
    throw new ApiError("Unable to load your account. Please try again.", response.status);
  }
  return user as User;
}

export async function getSession(): Promise<User | null> {
  const result = await send(api.GET("/api/auth/me", { credentials: "include" }), UNAVAILABLE);
  return result.response.status === 401 ? null : toUser(result, {});
}

export async function signIn(input: SignInInput): Promise<User> {
  const result = await send(api.POST("/api/auth/login", { body: input, credentials: "include" }), UNAVAILABLE);
  return toUser(result, { 401: "The email or password is incorrect. Please try again." });
}

export async function signUp(input: SignUpInput): Promise<User> {
  const result = await send(api.POST("/api/auth/register", { body: input, credentials: "include" }), UNAVAILABLE);
  return toUser(result, { 409: "An account with this email already exists. Try signing in." });
}

export async function signOut(): Promise<void> {
  const { response } = await send(api.POST("/api/auth/logout", { credentials: "include" }), UNAVAILABLE);
  if (!response.ok) throw new ApiError("Unable to sign out. Please try again.", response.status);
}

function resetFailure(response: Response, invalid?: string): never {
  if (response.status === 429) throw new ApiError("Too many attempts. Please wait a minute and try again.", 429);
  if (response.status === 503 || response.status === 404) throw new ApiError(RESET_UNAVAILABLE, response.status);
  if (response.status === 400 && invalid) throw new ApiError(invalid, 400);
  throw new ApiError(FAILED, response.status);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { response } = await send(
    api.POST("/api/auth/forgot-password", { body: { email }, credentials: "include" }),
    RESET_UNAVAILABLE,
  );
  if (!response.ok) resetFailure(response);
  // Do not treat an SPA fallback or unexpected response as a successful reset.
  if (response.status !== 202 || !isJson(response)) throw new ApiError(RESET_UNAVAILABLE, response.status);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const { response } = await send(
    api.POST("/api/auth/reset-password", { body: { token, newPassword }, credentials: "include" }),
    RESET_UNAVAILABLE,
  );
  if (!response.ok) resetFailure(response, "This reset link is invalid or expired. Request a new link.");
  if (response.status !== 204) throw new ApiError(RESET_UNAVAILABLE, response.status);
}
