#!/usr/bin/env node

const defaultBaseUrl = 'http://127.0.0.1:8787';

function parseArgs(argv) {
  const args = {
    baseUrl: defaultBaseUrl,
    strict: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--base-url') {
      const next = argv[index + 1];
      if (!next) {
        throw new Error('--base-url requires a value');
      }
      args.baseUrl = next;
      index += 1;
      continue;
    }

    if (token === '--non-strict') {
      args.strict = false;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

async function invokeJsonRpc(baseUrl, method, id, params = {}) {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params,
    }),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Invalid JSON response for method '${method}' (status ${response.status}).`);
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

function requirePolicyError(result) {
  if (!result.payload?.error?.data?.policyId) {
    throw new Error('Blocked call observed, but response did not include policyId metadata.');
  }

  return {
    policyId: result.payload.error.data.policyId,
    remediationHint: result.payload.error.data.remediationHint,
  };
}

async function main() {
  const { baseUrl, strict } = parseArgs(process.argv.slice(2));

  console.log(`Running mcp-firewall smoke test against ${baseUrl}`);

  const healthResponse = await fetch(`${baseUrl}/health`);
  if (!healthResponse.ok) {
    throw new Error(`Health endpoint failed with status ${healthResponse.status}.`);
  }

  const health = await healthResponse.json();
  console.log(`Health status: ${health.status}`);
  console.log(`Connected servers: ${health.connectedCount}/${health.totalConfiguredServers}`);

  const listToolsResult = await invokeJsonRpc(baseUrl, 'tools/list', 1, {});
  if (!listToolsResult.ok) {
    throw new Error(`tools/list failed with status ${listToolsResult.status}.`);
  }

  const tools = Array.isArray(listToolsResult.payload?.result?.tools)
    ? listToolsResult.payload.result.tools
    : [];

  console.log(`tools/list returned ${tools.length} tools`);

  if (tools.length === 0) {
    if (strict) {
      throw new Error('No tools available. Ensure at least one downstream server is connected.');
    }

    console.warn('No tools available. Skipping remaining smoke checks in non-strict mode.');
    return;
  }

  const readTool = tools.find(
    (tool) => typeof tool?.name === 'string' && tool.name.includes('read'),
  );
  if (!readTool) {
    if (strict) {
      throw new Error('No read-like tool found. Unable to verify allow behavior.');
    }

    console.warn('No read-like tool found. Skipping safe-call assertion in non-strict mode.');
  } else {
    const safeCallResult = await invokeJsonRpc(baseUrl, 'tools/call', 2, {
      name: readTool.name,
      arguments: {
        path: 'README.md',
      },
    });

    if (!safeCallResult.ok || safeCallResult.payload?.error) {
      throw new Error('Safe call failed; expected an allowed result payload.');
    }

    console.log(`Safe call succeeded with tool: ${readTool.name}`);
  }

  const riskyTool = tools.find(
    (tool) =>
      typeof tool?.name === 'string' &&
      (tool.name.includes('delete') || tool.name.includes('write')),
  );

  if (!riskyTool) {
    if (strict) {
      throw new Error('No risky delete/write tool found. Unable to verify deny behavior.');
    }

    console.warn('No risky tool found. Skipping deny assertion in non-strict mode.');
    return;
  }

  const blockedCallResult = await invokeJsonRpc(baseUrl, 'tools/call', 3, {
    name: riskyTool.name,
    arguments: {
      path: 'README.md',
    },
  });

  if (blockedCallResult.ok) {
    throw new Error('Expected blocked response, but risky call succeeded.');
  }

  const policyError = requirePolicyError(blockedCallResult);
  console.log(`Blocked call confirmed. policyId: ${policyError.policyId}`);
  if (policyError.remediationHint) {
    console.log(`Hint: ${policyError.remediationHint}`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
