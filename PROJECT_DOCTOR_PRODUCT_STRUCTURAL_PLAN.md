# Project Doctor --- Product Structural Plan (Student-First Direction)

## 1. Direction Reset

Project Doctor is no longer organized primarily around technical
checkpoints.

Checkpoints may still exist internally as implementation milestones, but
they are no longer the product's mental model.

The product is organized around the student's journey:

> **Understand → Investigate → Diagnose → Improve → Defend → Readiness**

### Product definition

> **Project Doctor is an AI-assisted project evaluator that examines a
> student's uploaded project documents and GitHub repository, compares
> what the project claims with what can actually be evidenced, explains
> technical weaknesses and uncertainties, suggests concrete
> improvements, and prepares the student for technical evaluation or
> jury questions.**

### Core principle

> **Deterministic systems establish facts. AI reasons over structured
> evidence.**

The student should experience one coherent evaluator, not a collection
of database tables exposed through a UI.

------------------------------------------------------------------------

## 2. Student Problem

A student usually does not want to manage:

-   13 requirements
-   requirement IDs
-   traceability records
-   evidence hashes
-   diagnostic rule IDs
-   AI analysis records
-   repository classifications

Those are internal mechanisms.

The student wants answers to:

1.  What does my project actually appear to be?
2.  Does my implementation support what I claim?
3.  What is weak, missing, inconsistent, or unverified?
4.  Why does it matter?
5.  What should I fix first?
6.  What questions could a reviewer or jury ask?
7.  Am I ready to defend this project?

Therefore, internal structures must be translated into student-facing
concepts such as:

-   capabilities
-   claims
-   strengths
-   problems
-   risks
-   unknowns
-   evidence
-   fixes
-   jury questions
-   readiness

------------------------------------------------------------------------

# 3. Product Model

The product should evolve toward this experience:

``` text
                    PROJECT
                       |
          +------------+------------+
          |                         |
      DOCUMENTS                  GITHUB
          |                         |
          +------------+------------+
                       |
                PROJECT MODEL
                       |
          +------------+------------+
          |            |            |
        CLAIMS     CAPABILITIES   EVIDENCE
          |            |            |
          +------------+------------+
                       |
                 INVESTIGATION
                       |
                    DIAGNOSIS
                       |
              +--------+--------+
              |                 |
           IMPROVE            DEFEND
              |                 |
              +--------+--------+
                       |
                 READINESS
```

------------------------------------------------------------------------

# 4. Primary User Flow

## Feature 1 --- Project Onboarding

### Student experience

The student creates a project by providing:

-   project name
-   problem statement
-   natural project description
-   tech stack
-   GitHub URL
-   optional goals or context
-   uploaded documents

Formal requirement entry must not be mandatory.

### Outcome

Project Doctor has enough material to begin understanding the project.

### Frontend

Build a clear onboarding experience rather than a database-style form.

The student should understand:

> "Give Project Doctor the material you already have."

------------------------------------------------------------------------

# 5. Feature 2 --- Project Understanding

After onboarding, Project Doctor produces a concise understanding:

### What we're building

-   project purpose
-   problem being solved
-   target users
-   major capabilities
-   technologies
-   architecture summary

### Important interaction

The student should be able to see:

> **"This is what I think your project is."**

The student can identify obvious misunderstandings before deeper
analysis.

### Internal machinery

Existing document extraction, project understanding, and requirement
extraction remain useful.

However, requirements are normalized and grouped internally rather than
presented as the primary UI.

------------------------------------------------------------------------

# 6. Feature 3 --- Project Investigation

Primary CTA:

> **Analyze Project**

The system investigates evidence from:

### Documentation

-   proposals
-   SRS
-   README
-   architecture documents
-   reports
-   uploaded PDFs and text documents

### GitHub

-   repository structure
-   source files
-   configuration
-   entrypoints
-   tests
-   implementation evidence
-   commit snapshot

### Deterministic analysis

Existing traceability and diagnostic logic.

### AI reasoning

CP8 AI reasoning interprets the structured evidence without replacing
deterministic facts.

### Frontend requirement

The investigation must be visible as a coherent product action.

The student should not need to understand individual backend engines.

------------------------------------------------------------------------

# 7. Feature 4 --- Project Diagnosis

This is the central product experience.

The result should be presented as:

## Strengths

What the evidence supports well.

## Problems

Concrete inconsistencies, missing implementation, or technical
weaknesses.

## Risks

Things that could become problems during evaluation or real use.

## Unknowns

Important things that cannot currently be verified from available
evidence.

Every important conclusion should allow the student to inspect
supporting evidence.

### Example

> **Role-based authorization is claimed but not fully evidenced.**

Why it matters:

> A reviewer may ask how unauthorized users are prevented from accessing
> protected operations.

Evidence:

-   documented capability
-   relevant repository files
-   traceability status
-   tests or missing tests

This is much more useful than showing a raw finding ID.

------------------------------------------------------------------------

# 8. Internal Requirements vs Student-Facing Capabilities

Requirements remain an internal evidence structure.

They should be:

-   extracted from documents
-   normalized
-   deduplicated
-   grouped
-   linked to evidence
-   linked to implementation

The UI should generally show:

> **Capabilities / Claims**

rather than:

> REQ-001, REQ-002, REQ-003...

### Example

Internal:

``` text
REQ-001
REQ-004
REQ-007
REQ-011
```

Student-facing:

``` text
Document Verification
```

With:

-   what the project claims
-   what was found
-   confidence
-   implementation evidence
-   verification evidence
-   unresolved gaps

This prevents duplicated documentation text from becoming duplicated
student-facing concepts.

------------------------------------------------------------------------

# 9. Feature 5 --- Improvement Plan

Diagnosis must lead to action.

Each important problem should become an actionable improvement.

### Student-facing structure

**Problem**

What is wrong or uncertain.

**Why it matters**

Technical and evaluation impact.

**What to do**

Concrete improvement steps.

**Priority**

Why it should be handled now versus later.

**Evidence to add**

What would make the claim verifiable.

**Possible jury question**

What a reviewer may ask because of the weakness.

The improvement planner is a future feature, but its contract should be
designed now so diagnosis feeds it naturally.

------------------------------------------------------------------------

# 10. Feature 6 --- Jury Preparation

Project Doctor should generate project-specific evaluation questions
from the actual project evidence.

Categories may include:

-   architecture
-   implementation
-   database
-   security
-   scalability
-   testing
-   design decisions
-   technology choices
-   limitations

The student answers.

Project Doctor evaluates the answer against the project's actual
evidence and identifies:

-   missing technical reasoning
-   unsupported claims
-   contradictions
-   weak explanations
-   evidence the student should mention

This should not become a generic chatbot.

It is a project-specific defense simulator.

------------------------------------------------------------------------

# 11. Feature 7 --- Readiness / Final Review

The final experience should summarize:

### What is strong

### What still needs attention

### What the student should fix before evaluation

### Questions they should prepare for

### Evidence that remains missing

The readiness view should explain its conclusions.

Avoid turning the product into a meaningless single score.

If a readiness indicator is eventually used, it must be secondary to the
underlying evidence and explanation.

------------------------------------------------------------------------

# 12. Frontend-First Feature Development Rule

From this point forward:

> **A feature is not considered complete when its backend exists. It is
> complete when the student can use and understand the feature through
> the frontend.**

Each feature must include:

1.  Student goal
2.  Frontend flow
3.  Backend/data requirements
4.  Deterministic reasoning where applicable
5.  AI reasoning where useful
6.  Evidence presentation
7.  Empty/loading/error states
8.  Manual end-to-end verification

### Example

AI Analysis is not complete because:

``` text
POST /ai-analysis/generate
```

exists.

It is complete when:

``` text
Student clicks Analyze Project
        ↓
Frontend shows analysis progress
        ↓
Backend investigates evidence
        ↓
AI reasons over structured evidence
        ↓
Frontend presents diagnosis
        ↓
Student can inspect evidence
        ↓
Student understands what to fix
```

------------------------------------------------------------------------

# 13. Frontend Evolution Strategy

The frontend is no longer frozen across the entire project.

It should evolve **incrementally with each product feature**.

Do not perform a giant frontend rewrite.

For every new feature:

-   reuse existing components where possible
-   improve navigation only when necessary
-   preserve working interactions
-   avoid unrelated visual changes
-   update the UI immediately after the underlying feature is
    implemented
-   manually verify the complete feature before moving on

The frontend should become the visible expression of the product
journey.

------------------------------------------------------------------------

# 14. Proposed Product Navigation

The exact visual design can evolve, but the conceptual navigation should
move toward:

``` text
Project Doctor

Project
├── Overview
├── Understand
├── Analyze
├── Diagnosis
├── Improve
├── Jury
└── Readiness
```

Secondary details such as documents, repository evidence, requirements,
and traceability can remain accessible as supporting evidence rather
than competing as top-level destinations.

------------------------------------------------------------------------

# 15. Evidence as a First-Class UX Concept

Evidence should be available when a student asks:

> "Why did Project Doctor say this?"

Every significant diagnosis should be explainable through:

``` text
Claim
   ↓
Evidence
   ↓
Interpretation
   ↓
Impact
```

The AI must not invent evidence.

Deterministic systems establish what exists.

AI explains what the evidence may mean.

------------------------------------------------------------------------

# 16. AI's Role

AI should not be a generic assistant sitting beside the product.

AI should be embedded where reasoning is genuinely useful:

### AI should help with

-   synthesizing project purpose
-   interpreting cross-document/repository relationships
-   explaining technical implications
-   identifying nuanced inconsistencies
-   expressing uncertainty
-   proposing evidence that would reduce uncertainty
-   generating project-specific jury questions
-   evaluating student defense answers
-   turning findings into understandable improvement guidance

### AI should not establish deterministic facts

Examples:

AI should not decide that:

> "File X exists."

The repository inspection establishes that.

AI may say:

> "The presence of this authentication middleware supports the
> documented authentication capability."

Likewise:

AI should not decide CP7 severity.

CP7 establishes deterministic severity.

AI explains why that finding matters in the project's context.

------------------------------------------------------------------------

# 17. Existing System Mapping

Existing technical work is retained where it supports the new product.

  Existing capability           New product role
  ----------------------------- ----------------------------------
  Project management            Project Onboarding
  Artifact upload               Project Evidence
  Document extraction           Project Understanding
  Requirement extraction        Internal Claims/Capability model
  GitHub integration            Project Investigation
  Repository classification     Evidence collection
  Requirement traceability      Implementation verification
  CP7 diagnostic engine         Deterministic Diagnosis
  CP8 AI reasoning              AI-assisted Diagnosis
  Future planner                Improve
  Future jury simulator         Jury
  Final aggregation/reporting   Readiness

This means existing work is not discarded. It is repositioned underneath
a clearer student experience.

------------------------------------------------------------------------

# 18. New Feature-Based Roadmap

## Phase A --- Product Foundation

### A1. Project Home / Overview

A student understands the state of their project immediately.

### A2. Project Understanding

Project Doctor summarizes what it thinks the project is.

### A3. Analyze Project

One coherent investigation action.

------------------------------------------------------------------------

## Phase B --- Diagnosis

### B1. Strengths

### B2. Problems

### B3. Risks

### B4. Unknowns

### B5. Evidence inspection

------------------------------------------------------------------------

## Phase C --- Improvement

### C1. Prioritized fixes

### C2. Concrete recommendations

### C3. Evidence needed

### C4. Verification after fixes

------------------------------------------------------------------------

## Phase D --- Defense

### D1. Project-specific jury questions

### D2. Student answers

### D3. Answer evaluation

### D4. Weak-area drilling

------------------------------------------------------------------------

## Phase E --- Readiness

### E1. Final project review

### E2. Remaining risks

### E3. Remaining evidence gaps

### E4. Jury preparation summary

### E5. Final report

------------------------------------------------------------------------

# 19. Development Workflow Going Forward

The old checkpoint sequence is no longer the primary planning method.

For each feature:

### Step 1 --- Define the student experience

What is the student trying to accomplish?

### Step 2 --- Design the frontend

What does the student see and interact with?

### Step 3 --- Identify required backend capabilities

Only build backend functionality required by the feature.

### Step 4 --- Connect deterministic evidence

Use existing deterministic systems wherever possible.

### Step 5 --- Add AI reasoning

Only where AI adds interpretation rather than replacing deterministic
facts.

### Step 6 --- Implement frontend + backend together

The frontend must be updated as part of the feature.

### Step 7 --- Test

Automated tests plus manual feature verification.

### Step 8 --- Commit

Only after the complete student-facing feature works.

------------------------------------------------------------------------

# 20. Immediate Next Feature

Do not start another AI backend checkpoint.

The immediate next feature should be:

# **Project Home + Project Understanding**

The goal is to establish the student's mental model of Project Doctor.

The student should be able to open their project and immediately see:

``` text
YOUR PROJECT

What Project Doctor understands
--------------------------------
Project purpose
Target users
Core capabilities
Technology stack
Architecture summary

Evidence collected
--------------------------------
Documents ✓
GitHub ✓
Requirements ✓
Implementation evidence ✓

Ready to investigate?

[ Analyze Project ]
```

This becomes the bridge between the existing foundation and the new
product direction.

------------------------------------------------------------------------

# 21. Non-Goals

Do not build:

-   generic document management software
-   requirement-management software
-   generic GitHub analytics
-   generic chatbot
-   enterprise project management
-   a dashboard full of metrics
-   a leaderboard
-   arbitrary AI-generated project scores
-   a requirement table as the primary product
-   backend-only features without a student-facing purpose

------------------------------------------------------------------------

# 22. Definition of a Successful Project Doctor

A student should be able to answer these questions after using Project
Doctor:

> **What does my project claim to do?**

> **What did Project Doctor actually verify?**

> **What is weak or uncertain?**

> **Why does that matter?**

> **What should I fix?**

> **What will the jury probably ask me?**

> **What evidence should I be ready to show?**

If the product cannot answer those questions clearly, more backend
complexity is not the solution.

------------------------------------------------------------------------

# 23. New Product North Star

> **Project Doctor investigates your project the way a technical
> evaluator would, then explains what it found, what you should fix, and
> how you should defend it.**

The student's mental model should always remain:

``` text
MY PROJECT
    ↓
WHAT I CLAIM
    ↓
WHAT EXISTS
    ↓
WHAT CAN BE PROVEN
    ↓
WHAT IS WRONG / UNCERTAIN
    ↓
WHAT I SHOULD FIX
    ↓
WHAT I SHOULD DEFEND
```

That is the product.
