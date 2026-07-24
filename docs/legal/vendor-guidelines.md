# Vendor trademark & AI-content guidelines (SCALE-004)

Researched against live vendor pages at authoring. **Not** copied from the monetization plan as current fact. Re-verify on a quarterly cadence (or before paid-channel work).

**Author:** Stephen Cheng  
**Authored:** 2026-07-24  
**Scope:** Amazon Web Services (AWS), Microsoft, Google — as they apply to CyberSkill’s independent practice-exam surfaces.

Shared site rules (all vendors):

- Plain-text nominative references only; no vendor logos, badges, or trade dress.
- Never imply affiliation, sponsorship, endorsement, or partnership.
- Banned self-descriptors remain those in `BANNED_DESCRIPTORS` (`src/lib/legal.ts`): official, authorized, authentic, certified by, endorsed, approved by, partner.
- Independence disclaimer names the correct mark owner per surface.
- Paid search / ads using vendor marks: **organic-only stance** until counsel + any vendor partner program explicitly permits otherwise.

---

## AWS

### Guidance sources (retrieved 2026-07-24)

| Source                                                   | URL                                                                                                 |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| AWS Trademark Guidelines                                 | https://aws.amazon.com/trademark-guidelines/                                                        |
| AWS Certification Agreement (name/logo of credentials)   | https://aws.amazon.com/certification/certification-agreement/                                       |
| AWS Partner branding (partner badge context)             | https://aws.amazon.com/partners/branding/                                                           |
| Exam guide PDF — AWS Certified AI Practitioner (AIF-C01) | https://docs.aws.amazon.com/pdfs/aws-certification/latest/ai-practitioner-01/ai-practitioner-01.pdf |

### Plain-text mark rules adopted

- Refer to exams and services in plain text for factual identification (e.g. “practice for AWS Certified AI Practitioner (AIF-C01)”).
- Do not use AWS logos, Architecture Icons as branding chrome, or Certification badges on CyberSkill surfaces.
- Do not claim AWS Partner status, “Powered by AWS,” or Marketplace affiliation.

### Prohibited descriptors (site)

Same global `BANNED_DESCRIPTORS`. Additionally avoid “AWS-approved,” “AWS official prep,” and partner-badge language.

### Disclaimer wording (adopted)

“CyberSkill is an independent practice-exam resource and is neither affiliated with, nor authorized, sponsored, or approved by, Amazon Web Services, Inc. or its affiliates.”

### Vendor-specific constraints

- AWS Trademark Guidelines condition many mark uses on customer/partner standing and prior approval; CyberSkill is **not** relying on a partner license — nominative fair-use style plain text only.
- AWS Partner Network creative/messaging and paid-search partner treatments are **out of scope**; do not run trademarked paid search for AWS marks without a validated partner path (plan note retained as operational constraint).

### AI-content policy finding → `permitted`

<a id="aws-ai-content-policy"></a>

Reviewed AWS Certification Agreement public pages (2026-07-24) for candidate obligations around exam content integrity (no sharing of live exam items, no dumps). **No CompTIA-style prohibition on AI-generated third-party practice content** was found in those public materials. Pipeline configs for AWS exams in this task therefore set `ai_generation_policy: permitted`. Live exam questions remain forbidden as sources (CONTENT-001/002).

---

## Microsoft

### Guidance sources (retrieved 2026-07-24)

| Source                                          | URL                                                                                                                                                                          |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Microsoft Trademark and Brand Guidelines        | https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks                                                                                                        |
| Microsoft logo third-party usage guidance (PDF) | https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/mscle/documents/legal/intellectualproperty/trademarks/Microsoft_logo_third_party_usage_guidance_.pdf |
| Exam AI-900 page (Microsoft Learn)              | https://learn.microsoft.com/en-us/credentials/certifications/exams/ai-900/                                                                                                   |
| Azure AI Fundamentals credential                | https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-fundamentals/                                                                                          |

### Plain-text mark rules adopted

- Plain-text references to Microsoft, Azure, and exam codes for identification.
- No Microsoft logo / product icons without a formal license (not obtained).
- Avoid “certified,” “official,” “authentic,” “licensed” as self-descriptors relative to Microsoft (aligns with Microsoft app trademark guidance language).

### Prohibited descriptors (site)

Global list + avoid “Microsoft-approved” / “official Azure prep.”

### Disclaimer wording (adopted)

“CyberSkill is an independent practice-exam resource and is neither affiliated with, nor authorized, sponsored, or approved by, Microsoft Corporation.”

### Vendor-specific constraints

- Logo use requires formal license — CyberSkill will not display Microsoft logos.
- **Exam logistics note (2026-07-24):** Microsoft Learn states Exam AI-900 was retired 2026-06-30 and replaced by AI-901 for the Azure AI Fundamentals credential path. This site’s ring-2 code remains `azure-ai-900` (plan slug) with landing copy that discloses retirement and points learners to verify current exam codes on Microsoft Learn. Content targets Azure AI Fundamentals domain knowledge, not recalled live items.

### AI-content policy finding → `permitted`

<a id="microsoft-ai-content-policy"></a>

Public Microsoft Learn credential pages and trademark guidelines (retrieved 2026-07-24) do **not** state a CompTIA-style ban on AI-authored third-party practice materials. Candidate agreements still prohibit misuse of live exam content. Finding: **`permitted`** for pipeline generation of original practice items.

---

## Google

### Guidance sources (retrieved 2026-07-24)

| Source                                                     | URL                                                               |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| Google Brand Permissions / Trademarks                      | https://about.google/brand-resource-center/trademarks/            |
| Google Cloud skills / certifications hub                   | https://cloud.google.com/learn/certification                      |
| Generative AI Leader (public listing; verify current path) | https://cloud.google.com/learn/certification/generative-ai-leader |

### Plain-text mark rules adopted

- Plain-text “Google,” “Google Cloud,” and credential name for nominative identification.
- No Google logos, four-color mark, or product icons without permission.

### Prohibited descriptors (site)

Global list + avoid “Google-approved” / “official Google Cloud prep.”

### Disclaimer wording (adopted)

“CyberSkill is an independent practice-exam resource and is neither affiliated with, nor authorized, sponsored, or approved by, Google LLC.”

### Vendor-specific constraints

- Follow Google Brand Resource Center rules: no confusingly similar logos; no implication of partnership.
- Always “verify with Google Cloud” for price, delivery, and validity on landing pages (CONTENT-003 logistics discipline).

### AI-content policy finding → `permitted`

<a id="google-ai-content-policy"></a>

Public Google trademark and Cloud certification pages reviewed 2026-07-24 showed **no CompTIA-style prohibition** on AI-generated third-party practice content. Finding: **`permitted`**. CompTIA remains excluded by standing CONTENT-002 policy and is not onboarded here.

---

## Re-verification

Next scheduled check: **2026-10-24** (or earlier if a vendor C&D / policy change is observed). Update retrieval dates and findings in place; bump pipeline config `_policy_finding` anchors if a finding flips to `prohibited` (that exam must be dropped, not overridden).
