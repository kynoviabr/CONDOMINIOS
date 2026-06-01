import { describe, expect, it } from "vitest";
import {
  formatCpf,
  isValidBrazilianPhoneDigits,
  isValidCpf,
  isValidEmail
} from "./brasil";

describe("Brazilian resident validation helpers", () => {
  it("validates CPF check digits", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("529.982.247-24")).toBe(false);
  });

  it("formats CPF for storage and display", () => {
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
    expect(formatCpf("529.982.247-25")).toBe("529.982.247-25");
  });

  it("validates normalized phone and whatsapp input", () => {
    expect(isValidBrazilianPhoneDigits("(11) 99999-0000")).toBe(true);
    expect(isValidBrazilianPhoneDigits("1133334444")).toBe(true);
    expect(isValidBrazilianPhoneDigits("123")).toBe(false);
  });

  it("validates optional resident email format through shared helper", () => {
    expect(isValidEmail("morador@example.com")).toBe(true);
    expect(isValidEmail("morador@invalid")).toBe(false);
  });
});
