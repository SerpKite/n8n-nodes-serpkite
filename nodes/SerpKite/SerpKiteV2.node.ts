import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import {
	assistantFields,
	assistantOperations,
	researchFields,
	researchOperations,
} from './v2/AiDescription';
import { mapsFields, mapsOperations } from './v2/MapsDescription';
import { searchFields, searchOperations } from './v2/SearchDescription';
import { buildCall, run } from './v2/transport';
import { webFields, webOperations } from './v2/WebDescription';

export class SerpKiteV2 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SerpKite',
		name: 'serpKite',
		icon: 'file:serpkite.svg',
		group: ['transform'],
		version: 2,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Search Google and its verticals, read and crawl webpages, get cited AI answers and research, and ask AI assistants',
		defaults: { name: 'SerpKite' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'serpKiteApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'AI Assistant', value: 'assistant' },
					{ name: 'AI Research', value: 'research' },
					{ name: 'Place', value: 'maps' },
					{ name: 'Search', value: 'search' },
					{ name: 'Web', value: 'web' },
				],
				default: 'search',
			},
			...searchOperations,
			...searchFields,
			...mapsOperations,
			...mapsFields,
			...webOperations,
			...webFields,
			...researchOperations,
			...researchFields,
			...assistantOperations,
			...assistantFields,
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						description: "Get the account's credit balance, limits and this month's usage",
						action: 'Get the account',
					},
				],
				default: 'get',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const output: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const call = buildCall(this, itemIndex);
				const response = await run(this, call);
				output.push({ json: response, pairedItem: { item: itemIndex } });
			} catch (error) {
				if (this.continueOnFail()) {
					output.push({ json: errorItem(error), pairedItem: { item: itemIndex } });
					continue;
				}
				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), error, { itemIndex });
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
			}
		}
		return [output];
	}
}

// The error item of continue-on-fail: the message plus, for API errors, the
// HTTP status and SerpKite's error code and message.
function errorItem(error: Error & { description?: string; httpCode?: string | null }) {
	const json: IDataObject = { error: error.message };
	if (error.description) json.description = error.description;
	if (error.httpCode) json.httpCode = error.httpCode;
	const data = (error as { context?: { data?: { error?: { code?: unknown } } } }).context?.data;
	if (typeof data?.error?.code === 'string') json.code = data.error.code;
	return json;
}
