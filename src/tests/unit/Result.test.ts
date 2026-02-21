import { describe, it, expect } from "vitest";
import { ok, fail, type Result } from "@server/core/domain/result/Result";

describe("Result", () => {
	it("ok() returns { ok: true, value }", () => {
		const result = ok(42);
		expect(result).toEqual({ ok: true, value: 42 });
	});

	it("fail() returns { ok: false, error }", () => {
		const error = new Error("something went wrong");
		const result = fail(error);
		expect(result).toEqual({ ok: false, error });
	});

	it("ok() preserves complex value types", () => {
		const value = { id: "abc", status: "sent" as const };
		const result = ok(value);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe(value);
		}
	});

	it("TypeScript narrows correctly after if (!result.ok)", () => {
		// The type of result is Result<number, Error>
		const result: Result<number, Error> = ok(99);

		if (!result.ok) {
			// This branch must not be entered; fail the test if it is
			expect.fail("ok result entered the failure branch");
		} else {
			// TypeScript knows result.value: number here
			expect(result.value).toBe(99);
		}
	});

	it("TypeScript narrows error branch correctly", () => {
		const error = new Error("boom");
		const result: Result<number, Error> = fail(error);

		if (result.ok) {
			expect.fail("fail result entered the success branch");
		} else {
			expect(result.error).toBe(error);
			expect(result.error.message).toBe("boom");
		}
	});
});
