/** Runs existing specialist SQL suites on native runner-only PostgreSQL, not a WASM emulator. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';

assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
assert.equal(process.env.PGHOST, '127.0.0.1');
assert.equal(process.env.PGPORT, '15432');
assert.match(process.env.GB_QA_DATABASE || '', /^gbqa_[a-z_]+$/);
const require = createRequire(path.join(process.env.GB_QA_DEPENDENCIES, 'package.json'));
const { Client } = require('pg');

/** Restricts every client to the disposable loopback container and bounded SQL execution. */
export async function connect(database = process.env.GB_QA_DATABASE) {
  assert.match(database, /^(postgres|gbqa_[a-z_]+)$/);
  const client = new Client({
    host: '127.0.0.1',
    port: 15432,
    user: 'postgres',
    password: process.env.PGPASSWORD,
    database,
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
    query_timeout: 18000,
    application_name: 'gradebook-disposable',
  });
  await client.connect();
  return client;
}

/** Preserves the narrow existing PGlite interface, without changing reviewed migration bytes. */
export class PGlite {
  constructor() {
    this.ready = this.initialize();
  }
  async initialize() {
    const admin = await connect('postgres');
    try {
      assert.match((await admin.query('SHOW server_version')).rows[0].server_version, /^17\./);
      await admin.query(`CREATE DATABASE ${process.env.GB_QA_DATABASE}`);
    } finally {
      await admin.end();
    }
    this.client = await connect();
  }
  async query(sql, args = []) {
    await this.ready;
    return this.client.query(sql, args);
  }
  async exec(sql) {
    await this.ready;
    // Roles are cluster-wide; each suite gets a fresh database but shares the disposable cluster.
    sql = sql.replace(
      /CREATE ROLE (anon|authenticated|service_role) ([^;]+);/g,
      (_, role, flags) =>
        `DO $$ BEGIN CREATE ROLE ${role} ${flags}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    );
    return this.client.query(sql);
  }
  async close() {
    await this.ready;
    await this.client.end();
  }
}
