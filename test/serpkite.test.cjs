const assert = require('node:assert/strict');
const { test } = require('node:test');
const { SerpKite } = require('../dist/nodes/SerpKite/SerpKite.node.js');
const { SerpKiteApi } = require('../dist/credentials/SerpKiteApi.credentials.js');

function context(parameters, responses, keepGoing = false) {
	const calls = [];
	return {
		calls,
		getInputData: () => parameters.map(() => ({ json: {} })),
		getNodeParameter: (key, index, fallback) => parameters[index][key] ?? fallback,
		getNode: () => ({ name: 'SerpKite', type: 'n8n-nodes-serpkite.serpKite', typeVersion: 1 }),
		continueOnFail: () => keepGoing,
		helpers: {
			httpRequestWithAuthentication: async function (credential, request) {
				calls.push({ credential, request });
				const response = responses[calls.length - 1];
				if (response instanceof Error) throw response;
				return response;
			},
		},
	};
}

test('search and news route each input and preserve response envelopes and item pairing', async () => {
	const responses = [
		{ results: [{ link: 'https://example.com' }], meta: { credits: 1 } },
		{ results: [], meta: { credits: 0 } },
	];
	const ctx = context(
		[
			{
				operation: 'search',
				q: 'one',
				options: { country: 'gb', language: 'en', num: 20, time: 'week' },
			},
			{ operation: 'news', q: 'two', options: { country: '' } },
		],
		responses,
	);
	const [items] = await new SerpKite().execute.call(ctx);
	assert.deepEqual(
		items,
		responses.map((json, item) => ({ json, pairedItem: { item } })),
	);
	assert.equal(ctx.calls[0].credential, 'serpKiteApi');
	assert.equal(ctx.calls[0].request.method, 'GET');
	assert.equal(ctx.calls[0].request.url, 'https://api.serpkite.com/v1/search');
	assert.deepEqual(ctx.calls[0].request.qs, {
		q: 'one',
		country: 'gb',
		language: 'en',
		num: 20,
		time: 'week',
	});
	assert.equal(ctx.calls[1].request.url, 'https://api.serpkite.com/v1/news');
	assert.deepEqual(ctx.calls[1].request.qs, { q: 'two' });
});

test('webpage uses JSON POST without search parameters', async () => {
	const response = { content: '# Example', meta: { credits: 1 } };
	const ctx = context([{ operation: 'webpage', url: 'https://example.com' }], [response]);
	const [items] = await new SerpKite().execute.call(ctx);
	assert.equal(items[0].json, response);
	assert.deepEqual(ctx.calls[0].request, {
		method: 'POST',
		url: 'https://api.serpkite.com/v1/webpage',
		json: true,
		body: { url: 'https://example.com' },
	});
});

test('continueOnFail records paired error and processes later inputs', async () => {
	const ctx = context(
		[
			{ operation: 'search', q: 'one', options: {} },
			{ operation: 'search', q: 'two', options: {} },
		],
		[new Error('HTTP 402 insufficient_credits'), { results: [] }],
		true,
	);
	const [items] = await new SerpKite().execute.call(ctx);
	assert.equal(items[0].json.error, 'HTTP 402 insufficient_credits');
	assert.deepEqual(items[0].pairedItem, { item: 0 });
	assert.deepEqual(items[1].pairedItem, { item: 1 });
});

test('upstream errors fail execution by default', async () => {
	const ctx = context(
		[{ operation: 'search', q: 'one', options: {} }],
		[new Error('upstream unavailable')],
	);
	await assert.rejects(new SerpKite().execute.call(ctx), /upstream unavailable/);
});

test('unknown operations never reach the network', async () => {
	const ctx = context([{ operation: '../account' }], []);
	await assert.rejects(new SerpKite().execute.call(ctx), /Unknown operation/);
	assert.equal(ctx.calls.length, 0);
});

test('credential sends a Bearer secret and tests a non-billable account endpoint', () => {
	const credential = new SerpKiteApi();
	assert.equal(
		credential.authenticate.properties.headers.Authorization,
		'=Bearer {{$credentials.apiKey}}',
	);
	assert.equal(credential.properties[0].typeOptions.password, true);
	assert.equal(credential.test.request.url, '/v1/account');
	assert.equal(credential.test.request.method, 'GET');
	assert.equal(new SerpKite().description.usableAsTool, true);
});
