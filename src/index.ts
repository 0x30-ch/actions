import * as core from '@actions/core';
import * as github from '@actions/github';
import { exec } from '@actions/exec';
import { readFileSync } from 'node:fs';
import { parse as parseToml } from 'toml';
import { resolve } from 'node:path';

async function git(cmd: string, args: string[], silent = false) {
  let stdout = '';
  let stderr = '';
  await exec(cmd, args, {
    listeners: {
      stdout: (data) => (stdout += data.toString()),
      stderr: (data) => (stderr += data.toString())
    },
    silent
  });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

async function refExists(octokit: ReturnType<typeof github.getOctokit>, tag: string) {
  const { owner, repo } = github.context.repo;
  try {
    await octokit.rest.git.getRef({ owner, repo, ref: `tags/${tag}` });
    return true;
  } catch {
    return false;
  }
}

async function run() {
  try {
    const cargoPath = core.getInput('cargo-path') || 'src-tauri/Cargo.toml';
    const tagPrefix = core.getInput('tag-prefix') || 'v';
    const messageTmpl = core.getInput('commit-message') || 'Release {version}';
    const push = core.getBooleanInput('push');
    const dryRun = core.getBooleanInput('dry-run');
    const token = process.env.GITHUB_TOKEN || core.getInput('token');
    const octokit = token ? github.getOctokit(token) : null;

    // --- Read version from Cargo.toml ---
    const abs = resolve(process.cwd(), cargoPath);
    const tomlRaw = readFileSync(abs, 'utf8');
    const toml = parseToml(tomlRaw);
    const version = toml?.package?.version as string | undefined;
    if (!version) throw new Error(`No [package].version found in ${cargoPath}`);
    const tag = `${tagPrefix}${version}`;
    core.info(`Detected version: ${version}`);

    // --- Check if tag exists ---
    let exists = false;
    if (octokit) {
      exists = await refExists(octokit, tag);
    } else {
      await git('git', ['fetch', '--tags', '--depth=1']).catch(() => { });
      const { stdout } = await git('git', ['tag', '--list', tag]);
      exists = stdout === tag;
    }

    if (exists) {
      core.info(`Tag ${tag} already exists. Skipping.`);
      core.setOutput('version', version);
      core.setOutput('tag-created', 'false');
      core.setOutput('tag-name', tag);
      return;
    }

    if (dryRun) {
      core.info(`[dry-run] Would create and push tag ${tag}`);
      core.setOutput('version', version);
      core.setOutput('tag-created', 'false');
      core.setOutput('tag-name', tag);
      return;
    }

    // --- Setup git identity ---
    await git('git', ['config', 'user.name', 'github-actions[bot]']);
    await git('git', ['config', 'user.email', 'github-actions[bot]@users.noreply.github.com']);

    // --- Create tag ---
    const message = messageTmpl.replace('{version}', version);
    await git('git', ['tag', '-a', tag, '-m', message]);
    core.info(`Created tag ${tag}`);

    // --- Push tag ---
    if (push) {
      await git('git', ['push', 'origin', tag]);
      core.info(`Pushed tag ${tag} to origin.`);
    }

    core.setOutput('version', version);
    core.setOutput('tag-created', 'true');
    core.setOutput('tag-name', tag);

    await core.summary
      .addHeading('Tag created ✅')
      .addTable([
        [{ data: 'Version', header: true }, version],
        [{ data: 'Tag', header: true }, tag],
        [{ data: 'Pushed', header: true }, String(push)]
      ])
      .write();

  } catch (err: any) {
    core.setFailed(err.message);
  }
}

run();
