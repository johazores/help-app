import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function requireFile(path) {
  if (!existsSync(join(root, path))) failures.push(`Missing ${path}`);
}

for (const path of [
  'LICENSE',
  'README.md',
  'docs/INSTAWARDS_EVIDENCE.md',
  'docs/INSTAWARDS_INTEGRATION.md',
  'docs/INSTAWARDS_TEST_PLAN.md',
  'server-backend/server/services/stellar-service.ts',
  'server-backend/server/services/safety-net-service.ts',
  'server-backend/scripts/e2e-test.ts',
  '.github/workflows/ci.yml',
]) {
  requireFile(path);
}

if (existsSync(join(root, 'LICENSE')) && !read('LICENSE').startsWith('MIT License')) {
  failures.push('Root LICENSE is not the MIT license');
}

const trackedFiles = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);
for (const path of trackedFiles) {
  const privateEnvironment = path === '.env' || (/^\.env\..+/.test(path) && path !== '.env.example');
  if (privateEnvironment || path.endsWith('.tsbuildinfo')) {
    failures.push(`Generated or private file must not be tracked: ${path}`);
  }
}

const stellar = read('server-backend/server/services/stellar-service.ts');
for (const required of [
  'Operation.createClaimableBalance',
  'Operation.claimClaimableBalance',
  'Claimant.predicateNot',
  'Claimant.predicateBeforeAbsoluteTime',
  'getClaimableBalanceId',
]) {
  if (!stellar.includes(required)) failures.push(`Missing Stellar implementation evidence: ${required}`);
}

const e2e = read('server-backend/scripts/e2e-test.ts');
for (const required of [
  'check-in',
  'take-back',
  'primary-receive-and-guard',
  'receiver-check-in',
  'backup-receive',
  'instawards-receipts.json',
]) {
  if (!e2e.includes(required)) failures.push(`Missing lifecycle evidence in the E2E test: ${required}`);
}

const evidence = read('docs/INSTAWARDS_EVIDENCE.md');
for (const prohibited of ['fully decentralized', 'guaranteed', 'available on request']) {
  if (evidence.toLowerCase().includes(prohibited)) {
    failures.push(`Evidence register contains unsupported wording: ${prohibited}`);
  }
}
if (!evidence.includes('Known limitations')) failures.push('Evidence register must disclose known limitations');

const commits = Number(execFileSync('git', ['rev-list', '--count', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim());
if (commits < 5) failures.push(`Repository history is too thin (${commits} commits)`);

const stellarCommits = execFileSync(
  'git',
  ['log', '--format=%H', '--', 'server-backend/server/services/stellar-service.ts', 'server-backend/scripts/e2e-test.ts'],
  { cwd: root, encoding: 'utf8' },
).split(/\r?\n/).filter(Boolean).length;
if (stellarCommits < 1) failures.push('No committed Stellar-specific development history found');

const clientPackage = read('client-frontend/package.json');
if (!clientPackage.includes('stellar-wallets-kit')) {
  warnings.push('Stellar Wallets Kit is proposed work and is not installed in the current baseline.');
}
warnings.push('Frontend and backend remain in one public monorepo; confirm this structure with the Chapter Lead.');
warnings.push('Public completion receipts and Ambassador verification still require external evidence.');

if (failures.length) {
  console.error('Instawards repository audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Instawards repository audit passed (${commits} commits; ${stellarCommits} Stellar-specific commits).`);
for (const warning of warnings) console.log(`- Note: ${warning}`);
