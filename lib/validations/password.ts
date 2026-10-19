// Shared by the signup form (live checklist) and the signUp server action (enforcement).
export const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "At least 1 letter", test: (p: string) => /[A-Za-z]/.test(p) },
  { label: "At least 1 number", test: (p: string) => /\d/.test(p) },
  { label: "At least 1 special character (e.g. ! @ # $ %)", test: (p: string) => /[^A-Za-z0-9\s]/.test(p) },
];

export const meetsPasswordPolicy = (password: string) => PASSWORD_RULES.every((rule) => rule.test(password));
