import { describe, it, expect } from "vitest";
import {
	SimpleTemplateRenderer,
	TemplateService,
} from "@server/core/services/TemplateService";
import type { Template } from "@server/core/domain/entities/Template";

// ── SimpleTemplateRenderer ────────────────────────────────────────────────────

describe("SimpleTemplateRenderer", () => {
	const renderer = new SimpleTemplateRenderer();

	it("replaces a single {{variable}} token", () => {
		const result = renderer.render("Hello {{name}}!", { name: "World" });
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toBe("Hello World!");
	});

	it("replaces multiple {{variable}} tokens", () => {
		const result = renderer.render("{{greeting}}, {{name}}.", {
			greeting: "Hi",
			name: "Alice",
		});
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toBe("Hi, Alice.");
	});

	it("passes through a template with no tokens unchanged", () => {
		const result = renderer.render("No placeholders here.", {});
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toBe("No placeholders here.");
	});

	it("returns fail(TemplateMissingVariable) when a token is absent from context", () => {
		const result = renderer.render("Hello {{name}}!", {});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("TEMPLATE_MISSING_VARIABLE");
			expect(result.error.message).toContain("name");
		}
	});

	it("fails on the first missing variable encountered", () => {
		const result = renderer.render("{{a}} and {{b}}", { a: "ok" });
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("TEMPLATE_MISSING_VARIABLE");
		}
	});
});

// ── TemplateService ───────────────────────────────────────────────────────────

describe("TemplateService", () => {
	const service = new TemplateService(new SimpleTemplateRenderer());

	const template: Template = {
		id: "tmpl-1",
		name: "welcome",
		subject: "Welcome, {{name}}!",
		body: "Hi {{name}}, your account is ready.",
		createdAt: new Date(),
	};

	it("renderTemplate renders subject and body", () => {
		const result = service.renderTemplate(template, { name: "Bob" });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.subject).toBe("Welcome, Bob!");
			expect(result.value.body).toBe("Hi Bob, your account is ready.");
		}
	});

	it("renderTemplate fails when subject has a missing variable", () => {
		const result = service.renderTemplate(template, {});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("TEMPLATE_MISSING_VARIABLE");
		}
	});
});
