# Project Rules

## Database Preservation
**CRITICAL**: The user has explicitly mandated that the current database structure and implementation must be preserved exactly as is. 
- DO NOT generate or modify database schemas, Firestore rules, or storage services (`DualStorageService.ts`, `firebase.ts`, `firebase-blueprint.json`, `firestore.rules`) unless explicitly requested to bypass this rule.
- Do not attempt to re-architect or refactor the database layer.
