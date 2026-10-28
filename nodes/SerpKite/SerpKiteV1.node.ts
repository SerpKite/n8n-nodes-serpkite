import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class SerpKite implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SerpKite',
		name: 'serpKite',
		icon: 'file:serpkite.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Search Google, search news, or fetch a public webpage as Markdown',
		defaults: { name: 'SerpKite' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'serpKiteApi', required: true }],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Fetch Webpage',
						value: 'webpage',
						description: 'Read a public HTML or PDF URL as Markdown',
						action: 'Fetch a webpage',
					},
					{
						name: 'News Search',
						value: 'news',
						description: 'Search Google News',
						action: 'Search google news',
					},
					{
						name: 'Web Search',
						value: 'search',
						description: 'Search Google web results',
						action: 'Search google',
					},
				],
				default: 'search',
			},
			{
				displayName: 'Query',
				name: 'q',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['search', 'news'] } },
				description: 'The Google search query',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['webpage'] } },
				description: 'Public HTTP or HTTPS URL to read',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { operation: ['search', 'news'] } },
				options: [
					{
						displayName: 'Country',
						name: 'country',
						type: 'string',
						default: '',
						description: 'Two-letter country code, such as us or gb',
					},
					{
						displayName: 'Language',
						name: 'language',
						type: 'string',
						default: '',
						description: 'Language code, such as en or de',
					},
					{
						displayName: 'Number of Results',
						name: 'num',
						type: 'number',
						typeOptions: { minValue: 1, maxValue: 100 },
						default: 10,
						description:
							'Results requested (1–100). Depth rounds up to whole pages and costs up to 7 credits.',
					},
					{
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
						description: 'Restrict results to this time window',
					},
				],
			},
		],
	};
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const output: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				if (!['search', 'news', 'webpage'].includes(operation))
					throw new NodeOperationError(this.getNode(), 'Unknown operation', { itemIndex });
				const webpage = operation === 'webpage';
				const options = webpage
					? {}
					: (this.getNodeParameter('options', itemIndex, {}) as IDataObject);
				const params: IDataObject = {
					q: webpage ? undefined : this.getNodeParameter('q', itemIndex),
				};
				for (const key of ['country', 'language', 'num', 'time']) {
					if (options[key] !== undefined && options[key] !== '') params[key] = options[key];
				}
				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'serpKiteApi',
					{
						method: webpage ? 'POST' : 'GET',
						url: `https://api.serpkite.com/v1/${operation}`,
						json: true,
						...(webpage
							? { body: { url: this.getNodeParameter('url', itemIndex) } }
							: { qs: params }),
					},
				)) as IDataObject;
				output.push({ json: response, pairedItem: { item: itemIndex } });
			} catch (error) {
				if (this.continueOnFail()) {
					output.push({ json: { error: error.message }, pairedItem: { item: itemIndex } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error, { itemIndex });
			}
		}
		return [output];
	}
}
