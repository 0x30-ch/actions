# Cargo Version Tag Action

A GitHub Action that automatically creates git tags based on the version specified in a Cargo.toml file. This action is particularly useful for Rust projects and Tauri applications where you want to automatically tag releases when the version in Cargo.toml changes.

## Features

- ✅ Reads version from any Cargo.toml file
- ✅ Creates annotated git tags with customizable prefixes
- ✅ Checks for existing tags to avoid duplicates
- ✅ Supports dry-run mode for testing
- ✅ Optional automatic pushing to remote
- ✅ Configurable commit messages

## Usage

```yaml
name: Auto Tag Release
on:
  push:
    branches: [main]
    paths: ['src-tauri/Cargo.toml']

jobs:
  tag:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Create tag from Cargo.toml version
        uses: ./
        with:
          cargo-path: 'src-tauri/Cargo.toml'
          tag-prefix: 'v'
          commit-message: 'Release {version}'
          push: true
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `cargo-path` | Path to Cargo.toml file | No | `src-tauri/Cargo.toml` |
| `tag-prefix` | Prefix for git tag (e.g., v) | No | `v` |
| `commit-message` | Tag annotation message template ({version} will be replaced) | No | `Release {version}` |
| `push` | Whether to push tag to origin | No | `true` |
| `dry-run` | If true, do not create or push tags | No | `false` |
| `token` | GitHub token (defaults to GITHUB_TOKEN) | No | `${{ github.token }}` |

## Outputs

| Output | Description |
|--------|-------------|
| `version` | Version read from Cargo.toml |
| `tag-created` | `true` if a new tag was created, `false` if tag already existed |
| `tag-name` | The tag name that was created (e.g., `v1.2.3`) |

## Examples

### Basic Usage

```yaml
- name: Tag release
  uses: 0x30/cargo-version-tag@v1
  with:
    cargo-path: 'Cargo.toml'
```

### Custom Configuration

```yaml
- name: Tag release with custom settings
  uses: 0x30/cargo-version-tag@v1
  with:
    cargo-path: 'backend/Cargo.toml'
    tag-prefix: 'backend-v'
    commit-message: 'Backend release {version}'
    push: false
```

### Dry Run Mode

```yaml
- name: Check what tag would be created
  uses: 0x30/cargo-version-tag@v1
  with:
    dry-run: true
```

### Using Outputs

```yaml
- name: Create tag
  id: tag
  uses: 0x30/cargo-version-tag@v1

- name: Create GitHub Release
  if: steps.tag.outputs.tag-created == 'true'
  uses: actions/create-release@v1
  with:
    tag_name: ${{ steps.tag.outputs.tag-name }}
    release_name: Release ${{ steps.tag.outputs.version }}
```

## How It Works

1. **Read Version**: Parses the specified Cargo.toml file to extract the version from `[package].version`
2. **Check Existing Tags**: Uses GitHub API or git commands to check if a tag for this version already exists
3. **Create Tag**: If the tag doesn't exist and not in dry-run mode, creates an annotated git tag
4. **Push Tag**: Optionally pushes the new tag to the remote repository
5. **Set Outputs**: Provides version information and creation status as action outputs

## Requirements

- The repository must contain a valid Cargo.toml file with a `[package].version` field
- For pushing tags, the action needs write permissions to the repository
- The action requires Node.js 20+ runtime

## License

MIT License - see LICENSE file for details