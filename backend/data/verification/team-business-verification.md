# Team Business Verification

Routes: `/teams`, `/teams/:id/business-verification`

Team Business Verification confirms that a Team account represents a legitimate registered business or organization. It is separate from creating a team and separate from personal Identity Verification (KYC).

## Prerequisites

- The Team must already exist and be accessible under `/teams`.
- The member submitting business verification must have completed personal Identity Verification (KYC) first and hold the required team permissions (such as team owner or authorized manager).
- Open `/teams`, select your team, and choose **Verify as Business** to open that team's verification page (the dynamic route requires your real team ID).

## Accepted business types and documents

Depending on your organization structure, Ensemble requests the matching registration document(s):

- **Sole Proprietorship:** DTI Certificate (required); optional BIR Certificate (Form 2303) and Mayor's/Business Permit.
- **One Person Corporation or Corporation:** SEC Certificate (required); optional General Information Sheet (GIS), Articles of Incorporation, BIR Certificate (Form 2303), and Mayor's/Business Permit.
- **Partnership:** SEC Certificate (required); optional Partnership Registration and BIR Certificate (Form 2303).
- **Cooperative:** CDA Certificate (required); optional Certificate of Compliance.
- **Non-Profit Organization:** Non-Profit Registration Document (required); optional SEC Certificate and BIR Certificate (Form 2303).
- **Educational Institution:** Government Recognition or Registration Document (required).
- **Government Organization:** Government Authorization Document (required).
- **Foreign Registered Business:** Foreign Business Registration Certificate (required).
- **Other:** Business Registration Document (required).

## Representative authorization

If the person submitting verification is listed as an **Authorized Representative**, **Employee**, or **Other** (rather than Owner, Sole Proprietor, Director, Partner, President, or Corporate Officer), an authorization document is also required. Accepted options include an Authorization Letter, Secretary's Certificate, Board Resolution, Special Power of Attorney, Proof of Employment or Appointment, or Other Authorization Document.

## Statuses and help

A team's business verification status may be unverified, pending review, approved, or rejected. If you need help with a team business verification review, open `/support/ticket` under **Support -> Account -> Teams** or **Identity verification**.
