import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function exists(path) {
  return existsSync(new URL(path, import.meta.url));
}

function readSecurityMigration() {
  const migrationDir = new URL("../supabase/migrations/", import.meta.url);
  const migration = readdirSync(migrationDir).find((file) => /security_remediation\.sql$/.test(file));
  assert.ok(migration, "security remediation migration should exist");
  return readFileSync(new URL(migration, migrationDir), "utf8");
}

test("diagram uploads and rendering reject active SVG and unsupported WebP media", () => {
  const files = read("../lib/utils/files.ts");
  const diagrams = read("../lib/utils/diagrams.ts");
  const storagePolicies = read("../supabase/storage-policies.sql");
  const uploadSurfaces = [
    "../components/contribute/SuggestionForm.tsx",
    "../components/diagrams/DiagramUpload.tsx",
    "../components/diagrams/DiagramManagerClient.tsx",
    "../components/media/MediaLibraryClient.tsx",
    "../components/capture/QuickCapture.tsx"
  ].map(read).join("\n");

  for (const source of [files, diagrams, storagePolicies, uploadSurfaces]) {
    assert.doesNotMatch(source, /image\/svg\+xml|\.svg\b/i);
    assert.doesNotMatch(source, /image\/webp|\.webp\b/i);
  }
  assert.match(files, /PNG, JPG, or JPEG/);
  assert.match(diagrams, /\?:png\|jpe\?g/);
  assert.match(storagePolicies, /array\['image\/png', 'image\/jpeg', 'image\/jpg'\]/);
});

test("public contribution submission is server mediated and bounded", () => {
  assert.ok(exists("../app/api/contributions/route.ts"));
  assert.ok(exists("../lib/security/contributionLimits.ts"));
  assert.ok(exists("../lib/security/rateLimit.ts"));

  const route = read("../app/api/contributions/route.ts");
  const form = read("../components/contribute/SuggestionForm.tsx");
  const limits = read("../lib/security/contributionLimits.ts");
  const schema = read("../supabase/schema.sql");
  const migration = readSecurityMigration();

  assert.match(form, /\/api\/contributions/);
  assert.doesNotMatch(form, /\.from\("suggestions"\)/);
  assert.doesNotMatch(form, /\.from\("suggestion-diagrams"\)/);
  assert.match(route, /getCurrentUserProfile/);
  assert.match(route, /enforceRateLimit/);
  assert.match(route, /multipart\/form-data/);
  assert.match(route, /validateContributionPayload/);
  assert.match(route, /suggestion-diagrams/);
  assert.match(route, /contentType: file\.type/);
  assert.match(limits, /SUGGESTION_TITLE_MAX = 180/);
  assert.match(limits, /SUGGESTION_BODY_MAX = 50000/);
  assert.match(limits, /SUGGESTION_TAG_MAX_COUNT = 20/);
  for (const source of [schema, migration]) {
    assert.match(source, /security_rate_limits/);
    assert.match(source, /check_rate_limit/);
    assert.match(source, /suggestions_rate_limit_insert/);
    assert.match(source, /suggestions_length_limits_check/);
    assert.match(source, /contribution_comments_body_length_check/);
  }
});

test("AI, export, and magic-link surfaces use generic errors and rate limits", () => {
  assert.ok(exists("../app/api/auth/magic-link/route.ts"));

  const noteAi = read("../app/api/ai/note-assist/route.ts");
  const notebookAi = read("../app/api/ai/notebook-assist/route.ts");
  const exportRoutes = [
    "../app/api/export/notebook/route.ts",
    "../app/api/export/notebook/markdown/route.ts",
    "../app/api/export/notebook/json/route.ts"
  ].map(read).join("\n");
  const magic = read("../app/api/auth/magic-link/route.ts");
  const login = read("../components/auth/LoginForm.tsx");

  assert.match(noteAi, /enforceRateLimit/);
  assert.match(notebookAi, /enforceRateLimit/);
  assert.match(exportRoutes, /enforceRateLimit/g);
  assert.doesNotMatch(noteAi, /detail:\s*detail\.slice/);
  assert.match(noteAi, /correlationId/);
  assert.match(magic, /normalizeEmail/);
  assert.match(magic, /signInWithOtp/);
  assert.match(magic, /enforceRateLimit/);
  assert.match(login, /\/api\/auth\/magic-link/);
  assert.doesNotMatch(login, /signInWithOtp/);
});

test("security headers, crawler controls, and dependency pins are configured", () => {
  assert.ok(exists("../app/robots.ts"));
  assert.ok(exists("../app/sitemap.ts"));

  const nextConfig = read("../next.config.ts");
  const robots = read("../app/robots.ts");
  const sitemap = read("../app/sitemap.ts");
  const pkg = JSON.parse(read("../package.json"));

  assert.match(nextConfig, /Strict-Transport-Security/);
  assert.match(nextConfig, /Permissions-Policy/);
  assert.match(nextConfig, /frame-ancestors 'none'/);
  assert.doesNotMatch(nextConfig, /unsafe-eval/);
  assert.match(robots, /disallow:\s*\["\/app", "\/login", "\/contribution-status"\]/);
  assert.match(sitemap, /visibility", "public"/);
  for (const [name, version] of Object.entries(pkg.dependencies)) {
    assert.notEqual(version, "latest", `${name} must be pinned`);
  }
  for (const [name, version] of Object.entries(pkg.devDependencies)) {
    assert.notEqual(version, "latest", `${name} must be pinned`);
  }
  assert.equal(pkg.overrides?.postcss, "^8.5.14");
});

test("security remediation documentation tracks every report finding", () => {
  assert.ok(exists("../security-stress-test-remediation.md"));
  const remediation = read("../security-stress-test-remediation.md");
  const report = read("../security-stress-test-report.md");

  for (const id of ["OC-SEC-001", "OC-SEC-002", "OC-SEC-003", "OC-SEC-004", "OC-SEC-005", "OC-SEC-006", "OC-SEC-007"]) {
    assert.match(remediation, new RegExp(id));
    assert.match(report, new RegExp(`${id}[\\s\\S]*Remediation status`));
  }
  assert.match(remediation, /Manual provider\/dashboard steps/);
  assert.match(remediation, /Convert existing SVG diagrams to PNG\/JPEG/);
});
