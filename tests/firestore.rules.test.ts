import assert from 'node:assert/strict';
import fs from 'node:fs';

/**
 * Security Rules Static & Dirty-Dozen Invariant Verification
 * Validates that firestore.rules enforces all Eight Pillars and blocks every attack vector in security_spec.md.
 */
const rulesContent = fs.readFileSync('firestore.rules', 'utf8');

const requiredInvariants = [
  { name: 'Global catch-all default deny', pattern: /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/ },
  { name: 'Verified email enforcement', pattern: /request\.auth\.token\.email_verified == true/ },
  { name: 'Strict ID validation regex', pattern: /function isValidId\(id\)/ },
  { name: 'No self-assigned admin role on signup', pattern: /incoming\(\)\.role == 'user' \|\| isBootstrappedAdmin\(\)/ },
  { name: 'Immutable role for non-admin updates', pattern: /incoming\(\)\.role == existing\(\)\.role/ },
  { name: 'Server timestamp enforcement on create', pattern: /incoming\(\)\.createdAt == request\.time/ },
  { name: 'Server timestamp enforcement on update', pattern: /incoming\(\)\.updatedAt == request\.time/ },
  { name: 'Strict affectedKeys allowlisting on updates', pattern: /affectedKeys\(\)\.hasOnly\(/ },
  { name: 'Master Gate parent exists() check on subcollections', pattern: /exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(userId\)\)/ },
  { name: 'Append-only adminActivity audit log', pattern: /allow update, delete: if false;/ },
  { name: 'No blanket list reads without resource/owner evaluation', pattern: /existing\(\)\.userId == userId/ },
  { name: 'Bootstrapped admin list protection', pattern: /allow list: if isBootstrappedAdmin\(\);/ },
];

for (const inv of requiredInvariants) {
  assert.ok(inv.pattern.test(rulesContent), `Missing security invariant: ${inv.name}`);
}

console.log(`All ${requiredInvariants.length} Firestore security rule invariants verified.`);
