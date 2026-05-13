# MCP Command Help

## Built-in commands

- `help`
- `?`

Show this help page.

## Documents

### List Documents

List documents in the current workspace.

- `list docs`
- `list all docs`
- `show docs`
- `list documents`
- `list all documents`
- `show documents`

Examples:

- `list docs`
- `list all docs`

Calls `list_documents`.

### Search Documents

Search documents by text query.

- `search docs <query>`
- `find docs <query>`
- `search documents <query>`
- `find documents <query>`

Examples:

- `search docs shader`
- `search documents shader`

Calls `search_documents`.

### Get Document

Read a single document by ID.

- `get doc <id>`
- `open doc <id>`
- `read doc <id>`
- `get document <id>`
- `open document <id>`
- `read document <id>`

Examples:

- `get doc abc123`
- `get document abc123`

Calls `get_document`.

## Projects

### List Projects

List all projects.

- `list projects`
- `list all projects`
- `show projects`

Examples:

- `list projects`
- `list all projects`

Calls `list_projects`.

## Fallback behavior

Messages that do not exactly match one of these commands should be sent to the LLM.
