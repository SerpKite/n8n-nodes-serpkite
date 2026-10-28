import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';

export const BASE_URL = 'https://api.serpkite.com';

const SECOND = 1000;

// Per-request timeouts. AI assistants answer in up to ~90 s and /v1/answer
// searches, reads pages and then writes, so both get two minutes.
const TIMEOUT = {
	default: 60 * SECOND,
	searchWithExtras: 120 * SECOND,
	answer: 120 * SECOND,
	assistant: 120 * SECOND,
	task: 30 * SECOND,
	account: 30 * SECOND,
};

// The API path of each assistant operation.
const ASSISTANTS: Record<string, string> = {
	chatgpt: 'chatgpt',
	gemini: 'gemini',
	copilot: 'copilot',
	aiMode: 'ai_mode',
	braveAi: 'brave_ai',
};

const SEARCH = [
	'search',
	'news',
	'images',
	'videos',
	'shopping',
	'scholar',
	'patents',
	'autocomplete',
];
const PLACE_ID_TYPES: Record<string, string[]> = {
	place: ['place_id', 'cid', 'fid', 'oid'],
	reviews: ['place_id', 'cid', 'fid'],
};
const TERMINAL = new Set(['completed', 'failed', 'canceled']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Options that the API takes as lists; the node takes them as text.
const COMMA_LISTS = new Set(['include_domains', 'exclude_domains', 'boost_domains', 'track']);
const LINE_LISTS = new Set(['include_paths', 'exclude_paths']);
const DATES = new Set(['start_date', 'end_date']);
const JSON_OBJECTS = new Set(['output_schema']);

export interface SerpKiteCall {
	method: IHttpRequestMethods;
	path: string;
	body?: IDataObject;
	timeout: number;
	// Set for crawl/research starts and gets: poll until the task ends.
	wait?: { kind: 'crawl' | 'research'; maxWaitSeconds: number };
}

function splitList(value: unknown, separator: RegExp): string[] {
	const parts = Array.isArray(value) ? value.map(String) : String(value).split(separator);
	return parts.map((part) => part.trim()).filter((part) => part !== '');
}

function toDate(ctx: IExecuteFunctions, name: string, value: unknown, itemIndex: number): string {
	if (value && typeof value === 'object' && 'toISODate' in value) {
		return (value as { toISODate: () => string }).toISODate();
	}
	const match = /^\d{4}-\d{2}-\d{2}/.exec(String(value).trim());
	if (!match) {
		throw new NodeOperationError(ctx.getNode(), `${name} must be a date (YYYY-MM-DD)`, {
			itemIndex,
		});
	}
	return match[0];
}

function toJsonObject(
	ctx: IExecuteFunctions,
	name: string,
	value: unknown,
	itemIndex: number,
): IDataObject {
	let parsed = value;
	if (typeof value === 'string') {
		try {
			parsed = JSON.parse(value);
		} catch {
			throw new NodeOperationError(ctx.getNode(), `${name} is not valid JSON`, { itemIndex });
		}
	}
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new NodeOperationError(ctx.getNode(), `${name} must be a JSON object`, { itemIndex });
	}
	return parsed as IDataObject;
}

// Turns the options collection into API fields: empty values are dropped
// (the API applies its defaults) and lists, dates and JSON are converted.
export function apiOptions(
	ctx: IExecuteFunctions,
	options: IDataObject,
	itemIndex: number,
): IDataObject {
	const out: IDataObject = {};
	for (const [name, value] of Object.entries(options)) {
		if (value === undefined || value === null || value === '') continue;
		if (COMMA_LISTS.has(name)) {
			const list = splitList(value, /[\n,]/);
			if (list.length) out[name] = list;
		} else if (LINE_LISTS.has(name)) {
			const list = splitList(value, /\r?\n/);
			if (list.length) out[name] = list;
		} else if (DATES.has(name)) {
			out[name] = toDate(ctx, name, value, itemIndex);
		} else if (JSON_OBJECTS.has(name)) {
			out[name] = toJsonObject(ctx, name, value, itemIndex);
		} else {
			out[name] = value;
		}
	}
	return out;
}

function required(ctx: IExecuteFunctions, name: string, itemIndex: number): string {
	const value = String(ctx.getNodeParameter(name, itemIndex, '') ?? '').trim();
	if (!value) {
		throw new NodeOperationError(ctx.getNode(), `${name} is required`, { itemIndex });
	}
	return value;
}

function taskPath(ctx: IExecuteFunctions, kind: string, itemIndex: number): string {
	const id = required(ctx, 'taskId', itemIndex);
	if (!UUID.test(id)) {
		throw new NodeOperationError(ctx.getNode(), 'Task ID must be a task UUID', { itemIndex });
	}
	return `/v1/${kind}/${id}`;
}

function waitOption(
	ctx: IExecuteFunctions,
	kind: 'crawl' | 'research',
	itemIndex: number,
): SerpKiteCall['wait'] {
	if (!ctx.getNodeParameter('waitForCompletion', itemIndex, false)) return undefined;
	const seconds = Number(ctx.getNodeParameter('maxWaitSeconds', itemIndex, 300));
	return { kind, maxWaitSeconds: Math.min(Math.max(seconds || 300, 10), 1800) };
}

// Builds the API call for one input item.
export function buildCall(ctx: IExecuteFunctions, itemIndex: number): SerpKiteCall {
	const resource = ctx.getNodeParameter('resource', itemIndex) as string;
	const operation = ctx.getNodeParameter('operation', itemIndex) as string;
	const unknown = () =>
		new NodeOperationError(ctx.getNode(), `Unknown operation ${resource}/${operation}`, {
			itemIndex,
		});
	const options = () =>
		apiOptions(ctx, ctx.getNodeParameter('options', itemIndex, {}) as IDataObject, itemIndex);

	switch (resource) {
		case 'search': {
			if (!SEARCH.includes(operation)) throw unknown();
			const body: IDataObject = { q: required(ctx, 'q', itemIndex), ...options() };
			const extras = Boolean(body.include_content) || body.include_answer === true;
			return {
				method: 'POST',
				path: `/v1/${operation}`,
				body,
				timeout: extras ? TIMEOUT.searchWithExtras : TIMEOUT.default,
			};
		}
		case 'maps': {
			if (operation === 'maps' || operation === 'places') {
				return {
					method: 'POST',
					path: `/v1/${operation}`,
					body: { q: required(ctx, 'q', itemIndex), ...options() },
					timeout: TIMEOUT.default,
				};
			}
			const idTypes = PLACE_ID_TYPES[operation];
			if (!idTypes) throw unknown();
			const idType = ctx.getNodeParameter('idType', itemIndex, 'place_id') as string;
			if (!idTypes.includes(idType)) {
				throw new NodeOperationError(ctx.getNode(), `Unknown identifier type ${idType}`, {
					itemIndex,
				});
			}
			return {
				method: 'POST',
				path: `/v1/${operation}`,
				body: { [idType]: required(ctx, 'placeIdentifier', itemIndex), ...options() },
				timeout: TIMEOUT.default,
			};
		}
		case 'web':
			switch (operation) {
				case 'webpage':
				case 'map':
					return {
						method: 'POST',
						path: `/v1/${operation}`,
						body: { url: required(ctx, 'url', itemIndex), ...options() },
						timeout: TIMEOUT.default,
					};
				case 'extract': {
					const urls = splitList(
						ctx.getNodeParameter('urls', itemIndex, ''),
						/\s+|,\s*(?=https?:\/\/)/i,
					);
					if (!urls.length) {
						throw new NodeOperationError(ctx.getNode(), 'urls is required', { itemIndex });
					}
					const body: IDataObject = { urls, ...options() };
					const ai = body.summary === true || body.output_schema !== undefined;
					// The server waits up to `timeout` seconds for the pages (50, or 75 with AI).
					const serverWait = Number(body.timeout) || (ai ? 75 : 50);
					return {
						method: 'POST',
						path: '/v1/extract',
						body,
						timeout: (serverWait + 15) * SECOND,
					};
				}
				case 'crawl':
					return {
						method: 'POST',
						path: '/v1/crawl',
						body: { url: required(ctx, 'url', itemIndex), ...options() },
						timeout: TIMEOUT.task,
						wait: waitOption(ctx, 'crawl', itemIndex),
					};
				case 'getCrawl':
					return {
						method: 'GET',
						path: taskPath(ctx, 'crawl', itemIndex),
						timeout: TIMEOUT.task,
						wait: waitOption(ctx, 'crawl', itemIndex),
					};
			}
			throw unknown();
		case 'research':
			switch (operation) {
				case 'answer':
					return {
						method: 'POST',
						path: '/v1/answer',
						body: { q: required(ctx, 'q', itemIndex), ...options() },
						timeout: TIMEOUT.answer,
					};
				case 'research':
					return {
						method: 'POST',
						path: '/v1/research',
						body: { input: required(ctx, 'input', itemIndex), ...options() },
						timeout: TIMEOUT.task,
						wait: waitOption(ctx, 'research', itemIndex),
					};
				case 'getResearch':
					return {
						method: 'GET',
						path: taskPath(ctx, 'research', itemIndex),
						timeout: TIMEOUT.task,
						wait: waitOption(ctx, 'research', itemIndex),
					};
			}
			throw unknown();
		case 'assistant': {
			const path = ASSISTANTS[operation];
			if (!path) throw unknown();
			return {
				method: 'POST',
				path: `/v1/${path}`,
				body: { prompt: required(ctx, 'prompt', itemIndex), ...options() },
				timeout: TIMEOUT.assistant,
			};
		}
		case 'account':
			if (operation !== 'get') throw unknown();
			return { method: 'GET', path: '/v1/account', timeout: TIMEOUT.account };
	}
	throw unknown();
}

async function send(
	ctx: IExecuteFunctions,
	method: IHttpRequestMethods,
	path: string,
	timeout: number,
	body?: IDataObject,
): Promise<IDataObject> {
	const request: IHttpRequestOptions = {
		method,
		url: `${BASE_URL}${path}`,
		json: true,
		timeout,
	};
	if (body) request.body = body;
	const response = (await ctx.helpers.httpRequestWithAuthentication.call(
		ctx,
		'serpKiteApi',
		request,
	)) as unknown;
	// format=markdown answers with a Markdown document instead of JSON.
	if (typeof response === 'string') return { markdown: response };
	return (response ?? {}) as IDataObject;
}

// Polls a crawl or research task until it ends or maxWaitSeconds pass, and
// returns the task as it stands. The delay grows from 2 s to 15 s.
async function waitForTask(
	ctx: IExecuteFunctions,
	task: IDataObject,
	wait: NonNullable<SerpKiteCall['wait']>,
): Promise<IDataObject> {
	const id = String(task.id ?? '');
	if (!UUID.test(id)) return task;
	const deadline = Date.now() + wait.maxWaitSeconds * SECOND;
	const signal = ctx.getExecutionCancelSignal?.();
	let delay = 2 * SECOND;
	let current = task;
	while (!TERMINAL.has(String(current.status))) {
		const left = deadline - Date.now();
		if (left <= 0 || signal?.aborted) break;
		await sleep(Math.min(delay, left));
		delay = Math.min(delay * 1.5, 15 * SECOND);
		current = await send(ctx, 'GET', `/v1/${wait.kind}/${id}`, TIMEOUT.task);
	}
	return current;
}

export async function run(ctx: IExecuteFunctions, call: SerpKiteCall): Promise<IDataObject> {
	const response = await send(ctx, call.method, call.path, call.timeout, call.body);
	return call.wait ? waitForTask(ctx, response, call.wait) : response;
}
