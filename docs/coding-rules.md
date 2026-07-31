# AI Coding Rules

Always follow these rules.

## Before Coding

- Search for existing implementations.
- Reuse existing utilities.
- Read related services before creating new code.

## Architecture

Business Logic

Service

Database

Repository

HTTP

Controller

Never violate this architecture.

## Code Style

- Make minimal changes.
- Do not rewrite unrelated code.
- Preserve existing APIs.
- Preserve existing naming conventions.
- Prefer extending existing functions.
- Avoid duplicate logic.
- Keep functions small.

## Database

MongoDB

- Forums only

PostgreSQL

- Notifications
- Accounts
- Payments

## WebSocket

Never remove websocket functionality.

If a feature updates forum data, determine whether a websocket event should also be emitted.

## Notifications

Always create notifications inside Services.

Never inside Repositories.

## Goal

Implement features with the smallest possible diff while keeping the existing project architecture intact.