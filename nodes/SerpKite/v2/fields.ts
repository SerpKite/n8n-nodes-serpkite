import type { INodeProperties } from 'n8n-workflow';

// Option fields shared by several operations. Each field's `name` is the API
// request field it sets, so the values pass through unchanged (see
// transport.ts for the few that are converted: lists, dates and JSON).

export const country: INodeProperties = {
	displayName: 'Country',
	name: 'country',
	type: 'string',
	default: '',
	placeholder: 'us',
	description: 'Two-letter country code (ISO 3166-1 alpha-2), such as us, gb or de',
};

export const language: INodeProperties = {
	displayName: 'Language',
	name: 'language',
	type: 'string',
	default: '',
	placeholder: 'en',
	description: 'Language code with an optional region, such as en, de or pt-br',
};

export const location: INodeProperties = {
	displayName: 'Location',
	name: 'location',
	type: 'string',
	default: '',
	placeholder: 'Austin, Texas, United States',
	description: 'Search as if from this place (city, region or country)',
};

export const mapPoint: INodeProperties = {
	displayName: 'Map Point',
	name: 'll',
	type: 'string',
	default: '',
	placeholder: '@40.7455,-74.0083,14z',
	description:
		'Search the map around this point, as "@latitude,longitude,zoomz" (zoom optional). Overrides Location.',
};

export const num: INodeProperties = {
	displayName: 'Number of Results',
	name: 'num',
	type: 'number',
	typeOptions: { minValue: 1, maxValue: 100 },
	default: 10,
	description:
		'Results to return (1–100). On web and news search, values above 10 read several result pages, billed per page. On image search, how many images of the page to return. Other searches return one page.',
};

export const page: INodeProperties = {
	displayName: 'Page',
	name: 'page',
	type: 'number',
	typeOptions: { minValue: 1, maxValue: 10 },
	default: 1,
	description: 'Result page to return (1–10)',
};

export const time: INodeProperties = {
	displayName: 'Time Window',
	name: 'time',
	type: 'options',
	options: [
		{ name: 'Day', value: 'day' },
		{ name: 'Hour', value: 'hour' },
		{ name: 'Month', value: 'month' },
		{ name: 'Week', value: 'week' },
		{ name: 'Year', value: 'year' },
	],
	default: 'week',
	description: 'Only results from this recent time window. Not with Start Date or End Date.',
};

export const startDate: INodeProperties = {
	displayName: 'Start Date',
	name: 'start_date',
	type: 'dateTime',
	default: '',
	description: 'Only results published on or after this date. Not with Time Window.',
};

export const endDate: INodeProperties = {
	displayName: 'End Date',
	name: 'end_date',
	type: 'dateTime',
	default: '',
	description: 'Only results published on or before this date. Not with Time Window.',
};

const domainHint =
	'Comma-separated, at most 20: a domain (example.com, subdomains match), a path prefix (github.com/org) or a TLD (.gov)';

export const includeDomains: INodeProperties = {
	displayName: 'Include Domains',
	name: 'include_domains',
	type: 'string',
	default: '',
	placeholder: 'github.com, en.wikipedia.org',
	description: `Only results from these domains. ${domainHint}.`,
};

export const excludeDomains: INodeProperties = {
	displayName: 'Exclude Domains',
	name: 'exclude_domains',
	type: 'string',
	default: '',
	placeholder: 'pinterest.com',
	description: `Drop results from these domains. ${domainHint}.`,
};

export const boostDomains: INodeProperties = {
	displayName: 'Boost Domains',
	name: 'boost_domains',
	type: 'string',
	default: '',
	placeholder: 'docs.python.org',
	description: `Move results from these domains to the top. ${domainHint}.`,
};

export const device: INodeProperties = {
	displayName: 'Device',
	name: 'device',
	type: 'options',
	options: [
		{ name: 'Desktop', value: 'desktop' },
		{ name: 'Mobile', value: 'mobile' },
	],
	default: 'desktop',
	description: 'Search as a desktop or a mobile visitor',
};

export const safe: INodeProperties = {
	displayName: 'SafeSearch',
	name: 'safe',
	type: 'options',
	options: [
		{ name: 'Active', value: 'active' },
		{ name: 'Off', value: 'off' },
	],
	default: 'off',
	description: 'Whether to filter explicit results',
};

export const autocorrect: INodeProperties = {
	displayName: 'Autocorrect',
	name: 'autocorrect',
	type: 'boolean',
	default: true,
	description: 'Whether to let Google correct the spelling of the query',
};

export const includeContent: INodeProperties = {
	displayName: 'Include Content',
	name: 'include_content',
	type: 'number',
	typeOptions: { minValue: 0, maxValue: 5 },
	default: 1,
	description:
		'Also read the top N result pages (0–5) and return them as Markdown, billed per page read',
};

export const highlights: INodeProperties = {
	displayName: 'Highlights',
	name: 'highlights',
	type: 'boolean',
	default: false,
	description:
		'Whether to return the passages most relevant to the query instead of whole pages (needs Include Content)',
};

export const ads: INodeProperties = {
	displayName: 'Include Ads',
	name: 'ads',
	type: 'boolean',
	default: false,
	description: 'Whether to include sponsored results',
};

export const includeAnswer: INodeProperties = {
	displayName: 'Include AI Answer',
	name: 'include_answer',
	type: 'boolean',
	default: false,
	description:
		'Whether to add a short cited AI answer written over the results (extra credits; not billed when it fails)',
};

export const engineSearch: INodeProperties = {
	displayName: 'Engine',
	name: 'engine',
	type: 'options',
	options: [
		{
			name: 'Auto',
			value: 'auto',
			description: 'Google, falling back to other search engines when Google is unavailable',
		},
		{ name: 'Bing', value: 'bing' },
		{ name: 'Brave', value: 'brave' },
		{
			name: 'Consensus',
			value: 'consensus',
			description:
				'Several search engines in parallel, merged and ranked by agreement; billed for each engine that answered',
		},
		{ name: 'DuckDuckGo', value: 'duckduckgo' },
		{ name: 'Google', value: 'google', description: 'Google only (default)' },
		{ name: 'Mojeek', value: 'mojeek' },
		{ name: 'Wikipedia', value: 'wikipedia' },
		{ name: 'Yahoo', value: 'yahoo' },
		{
			name: 'Yandex',
			value: 'yandex',
			description: 'Yandex web search, strongest for Russian queries',
		},
	],
	default: 'google',
	description: 'Which search engine answers',
};

export const engineGoogleAuto: INodeProperties = {
	displayName: 'Engine',
	name: 'engine',
	type: 'options',
	options: [
		{
			name: 'Auto',
			value: 'auto',
			description: 'Google, falling back to other search engines when Google is unavailable',
		},
		{ name: 'Google', value: 'google', description: 'Google only (default)' },
	],
	default: 'google',
	description: 'Which search engine answers',
};

export const engineMaps: INodeProperties = {
	displayName: 'Engine',
	name: 'engine',
	type: 'options',
	options: [
		{
			name: 'Auto',
			value: 'auto',
			description: 'Google, falling back to other search engines when Google is unavailable',
		},
		{ name: 'Google', value: 'google', description: 'Google only (default)' },
		{ name: 'Yandex', value: 'yandex', description: 'Yandex Maps, for Russia and the CIS' },
	],
	default: 'google',
	description: 'Which map service answers',
};

export const format: INodeProperties = {
	displayName: 'Response Format',
	name: 'format',
	type: 'options',
	options: [
		{ name: 'Compact', value: 'compact', description: 'Fewer fields, smaller for AI agents' },
		{ name: 'JSON', value: 'json', description: 'The full structured response' },
		{
			name: 'Markdown',
			value: 'markdown',
			description: 'A Markdown document, returned in the markdown field',
		},
	],
	default: 'json',
	description: 'Shape of the response',
};

export const fields: INodeProperties = {
	displayName: 'Fields',
	name: 'fields',
	type: 'string',
	default: '',
	placeholder: 'results.title,results.link',
	description: 'Comma-separated response fields to keep',
};

export const maxAge: INodeProperties = {
	displayName: 'Max Cache Age (Seconds)',
	name: 'max_age',
	type: 'number',
	typeOptions: { minValue: 0, maxValue: 2592000 },
	default: 3600,
	description: 'Accept a cached result up to this many seconds old. Cached results cost less.',
};

export const includeHtml: INodeProperties = {
	displayName: 'Include HTML',
	name: 'include_html',
	type: 'boolean',
	default: false,
	description: 'Whether to also return the page HTML',
};

export const includeLinks: INodeProperties = {
	displayName: 'Include Links',
	name: 'include_links',
	type: 'boolean',
	default: false,
	description: "Whether to also return the page's outbound links",
};

export const includeImages: INodeProperties = {
	displayName: 'Include Images',
	name: 'include_images',
	type: 'boolean',
	default: false,
	description: "Whether to also return the page's image URLs",
};

export const fetchCountry: INodeProperties = {
	...country,
	description:
		'Read the page as a visitor from this country (ISO 3166-1 alpha-2), for geo-dependent pages',
};

export const maxTokens: INodeProperties = {
	displayName: 'Max Tokens',
	name: 'max_tokens',
	type: 'number',
	typeOptions: { minValue: 100, maxValue: 100000 },
	default: 4000,
	description: 'Trim each page to about this many tokens',
};

export const includePaths: INodeProperties = {
	displayName: 'Include Paths',
	name: 'include_paths',
	type: 'string',
	typeOptions: { rows: 3 },
	default: '',
	placeholder: '^/docs/',
	description:
		'Regular expressions matched against the URL path, one per line (at most 20); keep only paths matching one',
};

export const excludePaths: INodeProperties = {
	displayName: 'Exclude Paths',
	name: 'exclude_paths',
	type: 'string',
	typeOptions: { rows: 3 },
	default: '',
	placeholder: '^/blog/',
	description:
		'Regular expressions matched against the URL path, one per line (at most 20); drop paths matching one',
};

export const includeSubdomains: INodeProperties = {
	displayName: 'Include Subdomains',
	name: 'include_subdomains',
	type: 'boolean',
	default: false,
	description: 'Whether to include pages on subdomains of the site',
};

export const ignoreQueryParameters: INodeProperties = {
	displayName: 'Ignore Query Parameters',
	name: 'ignore_query_parameters',
	type: 'boolean',
	default: false,
	description: 'Whether to treat URLs that differ only in their query string as one page',
};

export const sitemap: INodeProperties = {
	displayName: 'Sitemap',
	name: 'sitemap',
	type: 'options',
	options: [
		{ name: 'Include', value: 'include', description: "Use the site's sitemaps and its links" },
		{ name: 'Only', value: 'only', description: 'Use only the sitemaps' },
		{ name: 'Skip', value: 'skip', description: 'Follow links only' },
	],
	default: 'include',
	description: "How to use the site's sitemaps",
};

export const outputSchema: INodeProperties = {
	displayName: 'Output Schema',
	name: 'output_schema',
	type: 'json',
	default: '{\n  "type": "object",\n  "properties": {}\n}',
	description:
		'A JSON Schema (at most 16 KB); the result is also returned as JSON matching it in output',
};

export const webhookUrl: INodeProperties = {
	displayName: 'Webhook URL',
	name: 'webhook_url',
	type: 'string',
	default: '',
	placeholder: 'https://example.com/hooks/serpkite',
	description:
		'Receives a signed completion event when the task ends. Defaults to the account webhook.',
};

export const track: INodeProperties = {
	displayName: 'Track Brands or Domains',
	name: 'track',
	type: 'string',
	default: '',
	placeholder: 'hubspot.com, Pipedrive',
	description:
		'Comma-separated brands or domains (at most 20) to check the answer for; each comes back in mentions',
};

export const assistantMaxAge: INodeProperties = {
	...maxAge,
	description:
		'Accept a cached answer up to this many seconds old (answers are cached for at most an hour)',
};

export const waitForCompletion: INodeProperties = {
	displayName: 'Wait for Completion',
	name: 'waitForCompletion',
	type: 'boolean',
	default: false,
	description:
		'Whether to wait for the task to finish and return its result. Otherwise the task is returned as it stands.',
};

export const maxWait: INodeProperties = {
	displayName: 'Max Wait (Seconds)',
	name: 'maxWaitSeconds',
	type: 'number',
	typeOptions: { minValue: 10, maxValue: 1800 },
	default: 300,
	description:
		'Stop waiting after this many seconds and return the task as it stands (still queued or running)',
};

export const taskId: INodeProperties = {
	displayName: 'Task ID',
	name: 'taskId',
	type: 'string',
	default: '',
	required: true,
	placeholder: '01926a3e-7b2c-7c4e-9f1a-2b3c4d5e6f70',
	description: 'The ID returned when the task was started (kept for 24 hours)',
};
