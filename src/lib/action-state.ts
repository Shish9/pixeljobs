/** Serializable result shared by all form server actions. Messages are dictionary keys. */
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

export const idleState: ActionState = { status: "idle" };
