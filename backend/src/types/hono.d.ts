import "hono";

declare module "hono" {
  interface ContextVariableMap {
    user: {
      id: string;
      email: string | null;
      name: string | null;
    };
  }
}
