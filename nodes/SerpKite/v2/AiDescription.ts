import type { INodeProperties } from 'n8n-workflow';
import {
	assistantMaxAge,
	boostDomains,
	country,
	device,
	endDate,
	excludeDomains,
	fields,
	format,
	includeDomains,
	includeHtml,
	language,
	location,
	maxAge,
	maxWait,
	outputSchema,
	safe,
	startDate,
	taskId,
	time,
	track,
	waitForCompletion,
	webhookUrl,
} from './fields';

export const researchOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['research'] } },
		options: [
			{
				name: 'Answer',
				value: 'answer',
				description:
					'Get a short answer to a question, grounded on live Google results and citing them',
				action: 'Get a cited answer',
			},
			{
				name: 'Get Research',
				value: 'getResearch',
				description:
					'Get the status and report of a research task, optionally waiting for it to finish',
				action: 'Get a research task',
			},
			{
				name: 'Start Research',
				value: 'research',
				description:
					'Start a multi-step research task that searches, reads and writes a cited Markdown report, optionally waiting for the report',
				action: 'Start a research task',
			},
		],
		default: 'answer',
	},
];

export const researchFields: INodeProperties[] = [
	{
		displayName: 'Question',
		name: 'q',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['research'], operation: ['answer'] } },
		placeholder: 'What is retrieval-augmented generation?',
		description: 'The question to answer',
	},
	{
		displayName: 'Research Task',
		name: 'input',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		required: true,
		displayOptions: { show: { resource: ['research'], operation: ['research'] } },
		placeholder: 'Compare espresso machines under $500 for a small office',
		description: 'The research task in plain words',
	},
	{
		...taskId,
		displayOptions: { show: { resource: ['research'], operation: ['getResearch'] } },
	},
	{
		...waitForCompletion,
		displayOptions: { show: { resource: ['research'], operation: ['research', 'getResearch'] } },
	},
	{
		...maxWait,
		displayOptions: {
			show: {
				resource: ['research'],
				operation: ['research', 'getResearch'],
				waitForCompletion: [true],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['research'], operation: ['answer'] } },
		options: [
			boostDomains,
			country,
			{
				displayName: 'Depth',
				name: 'depth',
				type: 'options',
				options: [
					{ name: 'Fast', value: 'fast', description: 'Answer from the result page only' },
					{
						name: 'Standard',
						value: 'standard',
						description: 'Also read the top result pages (default)',
					},
				],
				default: 'standard',
				description: 'How much to read before answering',
			},
			device,
			endDate,
			excludeDomains,
			includeDomains,
			language,
			location,
			maxAge,
			{
				displayName: 'Number of Sources',
				name: 'num_sources',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 5 },
				default: 3,
				description: 'Pages read with Standard depth (1–5)',
			},
			{
				...outputSchema,
				description: 'A JSON Schema (at most 16 KB): the answer becomes a JSON value in output',
			},
			safe,
			startDate,
			time,
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['research'], operation: ['research'] } },
		options: [
			country,
			{
				displayName: 'Effort',
				name: 'effort',
				type: 'options',
				options: [
					{ name: 'Deep', value: 'deep', description: 'Most queries, rounds and pages' },
					{ name: 'Lite', value: 'lite', description: 'One quick round' },
					{ name: 'Standard', value: 'standard', description: 'Two rounds (default)' },
				],
				default: 'standard',
				description:
					'How thorough the research is. Each level has a flat price, see the pricing page.',
			},
			{
				...excludeDomains,
				description: 'Comma-separated domains (at most 20) never to use as sources',
			},
			{
				...includeDomains,
				description: 'Comma-separated domains (at most 20) to restrict the sources to',
			},
			language,
			{
				...outputSchema,
				description:
					'A JSON Schema (at most 16 KB): the report is also returned as a JSON value in result.output',
			},
			webhookUrl,
		],
	},
];

export const assistantOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['assistant'] } },
		options: [
			{
				name: 'Ask AI Mode',
				value: 'aiMode',
				description: "Get Google AI Mode's answer with cited sources and products",
				action: 'Ask google ai mode',
			},
			{
				name: 'Ask Brave AI',
				value: 'braveAi',
				description:
					"Get Brave Search's AI answer with cited sources, the searches it ran and products",
				action: 'Ask brave ai',
			},
			{
				name: 'Ask ChatGPT',
				value: 'chatgpt',
				description: "Get ChatGPT's answer with cited sources, products and places",
				action: 'Ask chatgpt',
			},
			{
				name: 'Ask Copilot',
				value: 'copilot',
				description: "Get Microsoft Copilot Search's answer with cited sources and products",
				action: 'Ask copilot',
			},
			{
				name: 'Ask Gemini',
				value: 'gemini',
				description: "Get Google Gemini's answer with the sources it grounded on",
				action: 'Ask gemini',
			},
		],
		default: 'chatgpt',
	},
];

const webSearch: INodeProperties = {
	displayName: 'Web Search',
	name: 'web_search',
	type: 'boolean',
	default: true,
	description: 'Whether to make ChatGPT search the web; off lets it decide',
};

const assistantCountry: INodeProperties = {
	...country,
	description: 'Ask from this country (ISO 3166-1 alpha-2): answers, prices and shops follow it',
};

const assistantLanguage: INodeProperties = {
	...language,
	description: "Interface language, such as en or de; the answer follows the prompt's language",
};

export const assistantFields: INodeProperties[] = [
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		required: true,
		displayOptions: { show: { resource: ['assistant'] } },
		placeholder: 'What are the best CRMs for a 10-person startup?',
		description: 'The message to the assistant (up to 4,000 characters)',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['assistant'], operation: ['chatgpt'] } },
		options: [assistantCountry, fields, includeHtml, assistantMaxAge, format, track, webSearch],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: { resource: ['assistant'], operation: ['aiMode', 'braveAi', 'copilot', 'gemini'] },
		},
		options: [
			assistantCountry,
			fields,
			includeHtml,
			assistantLanguage,
			assistantMaxAge,
			format,
			track,
		],
	},
];
