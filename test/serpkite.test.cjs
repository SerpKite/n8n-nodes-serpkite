const assert = require('node:assert/strict');
const { test } = require('node:test');
const { SerpKite } = require('../dist/nodes/SerpKite/SerpKite.node.js');
const { SerpKiteApi } = require('../dist/credentials/SerpKiteApi.credentials.js');

const API = 'https://api.serpkite.com';
const TASK_ID = '01926a3e-7b2c-7c4e-9f1a-2b3c4d5e6f70';

const v1 = () => new SerpKite().getNodeType(1);
const v2 = () => new SerpKite().getNodeType(2);

function context(parameters, responses, keepGoing = false, typeVersion = 1) {
	const calls = [];
	return {
		calls,
		getInputData: () => parameters.map(() => ({ json: {} })),
		getNodeParameter: (key, index, fallback) => parameters[index][key] ?? fallback,
		getNode: () => ({ name: 'SerpKite', type: 'n8n-nodes-serpkite.serpKite', typeVersion }),
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

// ---- Versioning -----------------------------------------------------------

test('the node is versioned: new nodes get v2, existing v1 workflows keep v1', () => {
	const node = new SerpKite();
	assert.equal(node.description.name, 'serpKite');
	assert.equal(node.description.defaultVersion, 2);
	assert.equal(node.getNodeType().description.version, 2);
	assert.deepEqual(Object.keys(node.nodeVersions).sort(), ['1', '2']);
	for (const version of [1, 2]) {
		const { description } = node.getNodeType(version);
		assert.equal(description.name, 'serpKite');
		assert.equal(description.version, version);
		assert.equal(description.usableAsTool, true);
		assert.deepEqual(description.credentials, [{ name: 'serpKiteApi', required: true }]);
		assert.equal(description.icon, 'file:serpkite.svg');
	}
});

test('v1 keeps the 0.1.0 parameters and operation values', () => {
	const { properties } = v1().description;
	const operation = properties.find((p) => p.name === 'operation');
	assert.deepEqual(operation.options.map((o) => o.value).sort(), ['news', 'search', 'webpage']);
	assert.equal(operation.default, 'search');
	assert.deepEqual(
		properties.map((p) => p.name),
		['operation', 'q', 'url', 'options'],
	);
	const options = properties.find((p) => p.name === 'options');
	assert.deepEqual(
		options.options.map((o) => o.name),
		['country', 'language', 'num', 'time'],
	);
	assert.equal(
		properties.some((p) => p.name === 'resource'),
		false,
	);
});

// ---- v1 behaviour (unchanged from 0.1.0) ------------------------------------

test('v1 search and news route each input and preserve response envelopes and item pairing', async () => {
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
	const [items] = await v1().execute.call(ctx);
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

test('v1 webpage uses JSON POST without search parameters', async () => {
	const response = { content: '# Example', meta: { credits: 1 } };
	const ctx = context([{ operation: 'webpage', url: 'https://example.com' }], [response]);
	const [items] = await v1().execute.call(ctx);
	assert.equal(items[0].json, response);
	assert.deepEqual(ctx.calls[0].request, {
		method: 'POST',
		url: 'https://api.serpkite.com/v1/webpage',
		json: true,
		body: { url: 'https://example.com' },
	});
});

test('v1 continueOnFail records paired error and processes later inputs', async () => {
	const ctx = context(
		[
			{ operation: 'search', q: 'one', options: {} },
			{ operation: 'search', q: 'two', options: {} },
		],
		[new Error('HTTP 402 insufficient_credits'), { results: [] }],
		true,
	);
	const [items] = await v1().execute.call(ctx);
	assert.equal(items[0].json.error, 'HTTP 402 insufficient_credits');
	assert.deepEqual(items[0].pairedItem, { item: 0 });
	assert.deepEqual(items[1].pairedItem, { item: 1 });
});

test('v1 upstream errors fail execution by default', async () => {
	const ctx = context(
		[{ operation: 'search', q: 'one', options: {} }],
		[new Error('upstream unavailable')],
	);
	await assert.rejects(v1().execute.call(ctx), /upstream unavailable/);
});

test('v1 unknown operations never reach the network', async () => {
	const ctx = context([{ operation: '../account' }], []);
	await assert.rejects(v1().execute.call(ctx), /Unknown operation/);
	assert.equal(ctx.calls.length, 0);
});

// ---- v2 request shapes ------------------------------------------------------

const S60 = 60000;
const S120 = 120000;
const S30 = 30000;

// [name, node parameters, expected request (method, path, body, timeout)]
const cases = [
	[
		'web search with every option converted',
		{
			resource: 'search',
			operation: 'search',
			q: 'best crm',
			options: {
				country: 'gb',
				language: 'en',
				location: 'London, England, United Kingdom',
				num: 20,
				page: 2,
				device: 'mobile',
				safe: 'active',
				autocorrect: false,
				ads: true,
				include_domains: 'github.com, en.wikipedia.org',
				exclude_domains: 'pinterest.com',
				boost_domains: 'docs.python.org\n.gov',
				start_date: '2026-01-01T00:00:00',
				end_date: '2026-01-31',
				engine: 'consensus',
				format: 'compact',
				fields: 'results.title',
				max_age: 600,
				time: '',
			},
		},
		{
			method: 'POST',
			path: '/v1/search',
			body: {
				q: 'best crm',
				country: 'gb',
				language: 'en',
				location: 'London, England, United Kingdom',
				num: 20,
				page: 2,
				device: 'mobile',
				safe: 'active',
				autocorrect: false,
				ads: true,
				include_domains: ['github.com', 'en.wikipedia.org'],
				exclude_domains: ['pinterest.com'],
				boost_domains: ['docs.python.org', '.gov'],
				start_date: '2026-01-01',
				end_date: '2026-01-31',
				engine: 'consensus',
				format: 'compact',
				fields: 'results.title',
				max_age: 600,
			},
			timeout: S60,
		},
	],
	[
		'web search with page content and an AI answer gets the long timeout',
		{
			resource: 'search',
			operation: 'search',
			q: 'rag',
			options: { include_content: 2, highlights: true, include_answer: true },
		},
		{
			method: 'POST',
			path: '/v1/search',
			body: { q: 'rag', include_content: 2, highlights: true, include_answer: true },
			timeout: S120,
		},
	],
	[
		'news search',
		{
			resource: 'search',
			operation: 'news',
			q: 'ai',
			options: { time: 'day', include_answer: true },
		},
		{
			method: 'POST',
			path: '/v1/news',
			body: { q: 'ai', time: 'day', include_answer: true },
			timeout: S120,
		},
	],
	...['images', 'videos', 'shopping', 'scholar', 'patents', 'autocomplete'].map((operation) => [
		`${operation} search`,
		{ resource: 'search', operation, q: 'heat pump', options: { country: 'de' } },
		{
			method: 'POST',
			path: `/v1/${operation}`,
			body: { q: 'heat pump', country: 'de' },
			timeout: S60,
		},
	]),
	[
		'maps search around a point',
		{
			resource: 'maps',
			operation: 'maps',
			q: 'coffee',
			options: { ll: '@40.7455,-74.0083,14z', engine: 'google' },
		},
		{
			method: 'POST',
			path: '/v1/maps',
			body: { q: 'coffee', ll: '@40.7455,-74.0083,14z', engine: 'google' },
			timeout: S60,
		},
	],
	[
		'local search',
		{ resource: 'maps', operation: 'places', q: 'coffee', options: { location: 'Austin, Texas' } },
		{
			method: 'POST',
			path: '/v1/places',
			body: { q: 'coffee', location: 'Austin, Texas' },
			timeout: S60,
		},
	],
	[
		'place by Yandex organisation id',
		{
			resource: 'maps',
			operation: 'place',
			idType: 'oid',
			placeIdentifier: '1045821788',
			options: { language: 'ru' },
		},
		{
			method: 'POST',
			path: '/v1/place',
			body: { oid: '1045821788', language: 'ru' },
			timeout: S60,
		},
	],
	[
		'place by place id (default identifier type)',
		{ resource: 'maps', operation: 'place', placeIdentifier: 'ChIJ123' },
		{ method: 'POST', path: '/v1/place', body: { place_id: 'ChIJ123' }, timeout: S60 },
	],
	[
		'reviews with paging',
		{
			resource: 'maps',
			operation: 'reviews',
			idType: 'fid',
			placeIdentifier: '0x1:0x2',
			options: { num: 10, page_token: 'abc' },
		},
		{
			method: 'POST',
			path: '/v1/reviews',
			body: { fid: '0x1:0x2', num: 10, page_token: 'abc' },
			timeout: S60,
		},
	],
	[
		'webpage',
		{
			resource: 'web',
			operation: 'webpage',
			url: 'https://example.com',
			options: { include_links: true, country: 'de', format: 'markdown' },
		},
		{
			method: 'POST',
			path: '/v1/webpage',
			body: { url: 'https://example.com', include_links: true, country: 'de', format: 'markdown' },
			timeout: S60,
		},
	],
	[
		'extract with AI summary and schema',
		{
			resource: 'web',
			operation: 'extract',
			urls: 'https://a.example/x?a=1,2\nhttps://b.example/doc.pdf, https://c.example/',
			options: {
				query: 'price',
				highlights: 2,
				summary: true,
				output_schema: '{"type":"object","properties":{"price":{"type":"number"}}}',
				prompt: 'Monthly price in USD',
				format: 'text',
				max_tokens: 2000,
			},
		},
		{
			method: 'POST',
			path: '/v1/extract',
			body: {
				urls: ['https://a.example/x?a=1,2', 'https://b.example/doc.pdf', 'https://c.example/'],
				query: 'price',
				highlights: 2,
				summary: true,
				output_schema: { type: 'object', properties: { price: { type: 'number' } } },
				prompt: 'Monthly price in USD',
				format: 'text',
				max_tokens: 2000,
			},
			timeout: 90000,
		},
	],
	[
		'extract with a server timeout',
		{
			resource: 'web',
			operation: 'extract',
			urls: ['https://a.example/'],
			options: { timeout: 20 },
		},
		{
			method: 'POST',
			path: '/v1/extract',
			body: { urls: ['https://a.example/'], timeout: 20 },
			timeout: 35000,
		},
	],
	[
		'map site',
		{
			resource: 'web',
			operation: 'map',
			url: 'https://docs.example.com/',
			options: {
				search: 'install',
				limit: 50,
				include_paths: '^/docs/\n^/guides/{1,2}',
				sitemap: 'only',
			},
		},
		{
			method: 'POST',
			path: '/v1/map',
			body: {
				url: 'https://docs.example.com/',
				search: 'install',
				limit: 50,
				include_paths: ['^/docs/', '^/guides/{1,2}'],
				sitemap: 'only',
			},
			timeout: S60,
		},
	],
	[
		'start crawl without waiting',
		{
			resource: 'web',
			operation: 'crawl',
			url: 'https://docs.example.com/',
			options: {
				limit: 5,
				max_depth: 1,
				exclude_paths: '^/blog/',
				webhook_url: 'https://h.example/',
			},
		},
		{
			method: 'POST',
			path: '/v1/crawl',
			body: {
				url: 'https://docs.example.com/',
				limit: 5,
				max_depth: 1,
				exclude_paths: ['^/blog/'],
				webhook_url: 'https://h.example/',
			},
			timeout: S30,
		},
	],
	[
		'get crawl',
		{ resource: 'web', operation: 'getCrawl', taskId: TASK_ID },
		{ method: 'GET', path: `/v1/crawl/${TASK_ID}`, timeout: S30 },
	],
	[
		'answer',
		{
			resource: 'research',
			operation: 'answer',
			q: 'what is rag',
			options: { depth: 'fast', num_sources: 2, include_domains: 'ibm.com' },
		},
		{
			method: 'POST',
			path: '/v1/answer',
			body: { q: 'what is rag', depth: 'fast', num_sources: 2, include_domains: ['ibm.com'] },
			timeout: S120,
		},
	],
	[
		'start research',
		{
			resource: 'research',
			operation: 'research',
			input: 'compare espresso machines',
			options: { effort: 'lite', output_schema: { type: 'object' }, exclude_domains: 'reddit.com' },
		},
		{
			method: 'POST',
			path: '/v1/research',
			body: {
				input: 'compare espresso machines',
				effort: 'lite',
				output_schema: { type: 'object' },
				exclude_domains: ['reddit.com'],
			},
			timeout: S30,
		},
	],
	[
		'get research',
		{ resource: 'research', operation: 'getResearch', taskId: TASK_ID },
		{ method: 'GET', path: `/v1/research/${TASK_ID}`, timeout: S30 },
	],
	[
		'ask ChatGPT',
		{
			resource: 'assistant',
			operation: 'chatgpt',
			prompt: 'best crm',
			options: { web_search: false, track: 'hubspot.com, Pipedrive', country: 'us' },
		},
		{
			method: 'POST',
			path: '/v1/chatgpt',
			body: {
				prompt: 'best crm',
				web_search: false,
				track: ['hubspot.com', 'Pipedrive'],
				country: 'us',
			},
			timeout: S120,
		},
	],
	...[
		['gemini', 'gemini'],
		['copilot', 'copilot'],
		['aiMode', 'ai_mode'],
		['braveAi', 'brave_ai'],
	].map(([operation, path]) => [
		`ask ${operation}`,
		{ resource: 'assistant', operation, prompt: 'hello', options: { language: 'de' } },
		{
			method: 'POST',
			path: `/v1/${path}`,
			body: { prompt: 'hello', language: 'de' },
			timeout: S120,
		},
	]),
	[
		'account',
		{ resource: 'account', operation: 'get' },
		{ method: 'GET', path: '/v1/account', timeout: S30 },
	],
];

for (const [name, parameters, expected] of cases) {
	test(`v2 ${name}`, async () => {
		const response = { ok: true, status: 'queued', meta: {} };
		const ctx = context([parameters], [response], false, 2);
		const [items] = await v2().execute.call(ctx);
		assert.deepEqual(items, [{ json: response, pairedItem: { item: 0 } }]);
		assert.equal(ctx.calls.length, 1);
		assert.equal(ctx.calls[0].credential, 'serpKiteApi');
		const request = {
			method: expected.method,
			url: `${API}${expected.path}`,
			json: true,
			timeout: expected.timeout,
		};
		if (expected.body) request.body = expected.body;
		assert.deepEqual(ctx.calls[0].request, request);
	});
}

test('v2 covers every operation offered in the UI', () => {
	const { properties } = v2().description;
	const offered = properties
		.filter((p) => p.name === 'operation')
		.flatMap((p) => p.options.map((o) => `${p.displayOptions.show.resource[0]}/${o.value}`));
	const tested = new Set(cases.map(([, p]) => `${p.resource}/${p.operation}`));
	assert.deepEqual(
		offered.filter((op) => !tested.has(op)),
		[],
	);
	assert.equal(offered.length, 26);
});

// ---- v2 behaviour -----------------------------------------------------------

test('v2 markdown responses come back in a markdown field', async () => {
	const ctx = context(
		[{ resource: 'search', operation: 'search', q: 'x', options: { format: 'markdown' } }],
		['# Results\n'],
		false,
		2,
	);
	const [items] = await v2().execute.call(ctx);
	assert.deepEqual(items[0].json, { markdown: '# Results\n' });
});

test('v2 start crawl and wait polls until the task ends', async () => {
	const created = { id: TASK_ID, kind: 'crawl', status: 'queued', credits_reserved: 5 };
	const done = { id: TASK_ID, kind: 'crawl', status: 'completed', result: { pages: [] } };
	const ctx = context(
		[
			{
				resource: 'web',
				operation: 'crawl',
				url: 'https://example.com/',
				waitForCompletion: true,
				maxWaitSeconds: 60,
			},
		],
		[created, done],
		false,
		2,
	);
	const [items] = await v2().execute.call(ctx);
	assert.deepEqual(items, [{ json: done, pairedItem: { item: 0 } }]);
	assert.equal(ctx.calls.length, 2);
	assert.equal(ctx.calls[0].request.method, 'POST');
	assert.deepEqual(ctx.calls[1].request, {
		method: 'GET',
		url: `${API}/v1/crawl/${TASK_ID}`,
		json: true,
		timeout: S30,
	});
});

test('v2 get research and wait returns a finished task at once', async () => {
	const done = { id: TASK_ID, kind: 'research', status: 'completed', result: { report: '# R' } };
	const ctx = context(
		[{ resource: 'research', operation: 'getResearch', taskId: TASK_ID, waitForCompletion: true }],
		[done],
		false,
		2,
	);
	const [items] = await v2().execute.call(ctx);
	assert.equal(items[0].json, done);
	assert.equal(ctx.calls.length, 1);
});

test('v2 rejects task ids that are not UUIDs before any request', async () => {
	const ctx = context(
		[{ resource: 'web', operation: 'getCrawl', taskId: '../account' }],
		[],
		false,
		2,
	);
	await assert.rejects(v2().execute.call(ctx), /Task ID must be a task UUID/);
	assert.equal(ctx.calls.length, 0);
});

test('v2 rejects unknown operations and identifier types before any request', async () => {
	for (const parameters of [
		{ resource: 'search', operation: '../account', q: 'x' },
		{ resource: 'assistant', operation: 'perplexity', prompt: 'x' },
		{ resource: 'nope', operation: 'get' },
		{ resource: 'maps', operation: 'reviews', idType: 'oid', placeIdentifier: '1' },
	]) {
		const ctx = context([parameters], [], false, 2);
		await assert.rejects(v2().execute.call(ctx), /Unknown/);
		assert.equal(ctx.calls.length, 0);
	}
});

test('v2 rejects invalid JSON schemas and dates before any request', async () => {
	for (const [options, message] of [
		[{ output_schema: '{not json' }, /output_schema is not valid JSON/],
		[{ output_schema: '[1]' }, /output_schema must be a JSON object/],
		[{ start_date: 'last week' }, /start_date must be a date/],
	]) {
		const ctx = context(
			[{ resource: 'research', operation: 'answer', q: 'x', options }],
			[],
			false,
			2,
		);
		await assert.rejects(v2().execute.call(ctx), message);
		assert.equal(ctx.calls.length, 0);
	}
});

test('v2 continueOnFail records a paired error with the API error code and goes on', async () => {
	const apiError = Object.assign(new Error('Bad request - please check your parameters'), {
		description: 'unknown parameter "nope"',
		httpCode: '400',
		context: { data: { error: { code: 'invalid_request', message: 'unknown parameter "nope"' } } },
	});
	const ctx = context(
		[
			{ resource: 'search', operation: 'search', q: 'one' },
			{ resource: 'account', operation: 'get' },
		],
		[apiError, { balance: 1 }],
		true,
		2,
	);
	const [items] = await v2().execute.call(ctx);
	assert.deepEqual(items, [
		{
			json: {
				error: 'Bad request - please check your parameters',
				description: 'unknown parameter "nope"',
				httpCode: '400',
				code: 'invalid_request',
			},
			pairedItem: { item: 0 },
		},
		{ json: { balance: 1 }, pairedItem: { item: 1 } },
	]);
});

test('v2 upstream errors fail execution by default', async () => {
	const ctx = context(
		[{ resource: 'search', operation: 'news', q: 'one' }],
		[new Error('upstream unavailable')],
		false,
		2,
	);
	await assert.rejects(v2().execute.call(ctx), /upstream unavailable/);
});

// ---- Credential -------------------------------------------------------------

test('credential sends a Bearer secret and tests a non-billable account endpoint', () => {
	const credential = new SerpKiteApi();
	assert.equal(
		credential.authenticate.properties.headers.Authorization,
		'=Bearer {{$credentials.apiKey}}',
	);
	assert.equal(credential.properties[0].typeOptions.password, true);
	assert.equal(credential.test.request.url, '/v1/account');
	assert.equal(credential.test.request.method, 'GET');
});
