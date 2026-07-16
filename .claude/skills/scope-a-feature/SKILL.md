---
name: scope-a-feature
description: Use whenever the user says something like "I want to add a feature," "I want to build X," or otherwise proposes a new feature idea, before any planning or code is written. Runs a clarify-ideate-confirm sequence — sharp questions about scope and edge cases, a short list of adjacent feature ideas, then a one-paragraph restated plan — and gates all building on the user's explicit approval of that restatement. Trigger on phrases like "I want to add a feature", "I want to build a...", "can we add...", or "new feature idea:".
---

# Scope a Feature

**Never start building — not even a plan — until the user has explicitly approved a restated one-paragraph plan.**

## 1. Detect the trigger

Fires whenever the user proposes a new feature, however phrased ("I want to add...", "what if we built...", "new feature idea:"). Do not start scoping vague musings or bug reports — only genuine new-feature proposals.

## 2. Ask sharp clarifying questions

Ask a focused, non-exhaustive batch of plain conversational questions (not the AskUserQuestion tool — scoping is open-ended, not a closed choice) covering:
- Who/what this is for, and what triggers or surfaces it
- Expected behavior on the happy path
- Concrete edge cases: empty/missing data, repeated or concurrent use, failure/error states, and any scale or permission limits that plausibly apply

Keep it tight — enough to remove real ambiguity, not a questionnaire.

## 3. Propose adjacent ideas

Offer 2-4 concrete features that extend or complement the idea, each with a one-line reason it's worth considering. Present these as options, not commitments.

## 4. Wait for answers

Do not restate a plan, write a plan file, or touch any code until the user has responded.

## 5. Restate the plan

Fold the user's answers (and any adjacent ideas they picked) into a single plain-language paragraph, then explicitly ask for approval to proceed (e.g. "Should I go ahead and build this?").

## 6. Build only after explicit approval

Proceed only on a clear yes. If the user changes or adds scope at this point, loop back to step 5 with an updated restatement before building anything.

## Do Not

- Do not write code, a plan file, or any implementation before explicit approval.
- Do not skip edge-case questions to save time.
- Do not bury the approval ask in a wall of questions — ask, then wait.
- Do not treat silence, a partial answer, or a vague reply as approval.
