export class NavError extends Error {
  constructor(code, message, status = 503) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function publicError(error) {
  return error instanceof NavError
    ? { status: error.status, code: error.code, message: error.message }
    : { status: 503, code: "NAV_UNAVAILABLE", message: "Quote preparation is unavailable. No user transaction was sent. Please retry later." };
}
