import type { INodeProperties } from 'n8n-workflow';
import {
	autocorrect,
	country,
	device,
	engineMaps,
	fields,
	format,
	language,
	location,
	mapPoint,
	maxAge,
	num,
	page,
	safe,
} from './fields';

export const mapsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['maps'] } },
		options: [
			{
				name: 'Get Place',
				value: 'place',
				description:
					'Get the full listing of one place: address, coordinates, hours, phone, website, rating and photos',
				action: 'Get a place',
			},
			{
				name: 'Get Reviews',
				value: 'reviews',
				description: 'Get the reviews of a place',
				action: 'Get place reviews',
			},
			{
				name: 'Local Search',
				value: 'places',
				description: 'Search local results (places), same results as Maps Search',
				action: 'Search local places',
			},
			{
				name: 'Maps Search',
				value: 'maps',
				description:
					'Search Google Maps for places with address, coordinates, rating, hours and identifiers',
				action: 'Search maps',
			},
		],
		default: 'maps',
	},
];

export const mapsFields: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'q',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['maps'], operation: ['maps', 'places'] } },
		placeholder: 'coffee',
		description:
			'What to look for. Local queries such as "coffee" need a Location or Map Point option.',
	},
	{
		displayName: 'Identifier Type',
		name: 'idType',
		type: 'options',
		options: [
			{ name: 'CID', value: 'cid', description: 'Decimal customer ID (cid of a maps result)' },
			{
				name: 'Feature ID',
				value: 'fid',
				description: 'Feature ID "0x…:0x…" (fid of a maps result)',
			},
			{
				name: 'Place ID',
				value: 'place_id',
				description: 'Google place ID "ChIJ…" (place_id of a maps result)',
			},
			{
				name: 'Yandex Organisation ID',
				value: 'oid',
				description: 'Yandex Maps organisation ID (oid of a Yandex maps result)',
			},
		],
		default: 'place_id',
		displayOptions: { show: { resource: ['maps'], operation: ['place'] } },
		description: 'Which identifier of the place you have',
	},
	{
		displayName: 'Identifier Type',
		name: 'idType',
		type: 'options',
		options: [
			{ name: 'CID', value: 'cid', description: 'Decimal customer ID (cid of a maps result)' },
			{
				name: 'Feature ID',
				value: 'fid',
				description: 'Feature ID "0x…:0x…" (fid of a maps result)',
			},
			{
				name: 'Place ID',
				value: 'place_id',
				description: 'Google place ID "ChIJ…" (place_id of a maps result)',
			},
		],
		default: 'place_id',
		displayOptions: { show: { resource: ['maps'], operation: ['reviews'] } },
		description: 'Which identifier of the place you have',
	},
	{
		displayName: 'Place Identifier',
		name: 'placeIdentifier',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['maps'], operation: ['place', 'reviews'] } },
		placeholder: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
		description: 'The identifier, taken from a Maps Search result',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['maps'], operation: ['maps', 'places'] } },
		options: [
			autocorrect,
			country,
			device,
			engineMaps,
			fields,
			language,
			location,
			mapPoint,
			maxAge,
			num,
			page,
			format,
			safe,
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['maps'], operation: ['place'] } },
		options: [country, fields, language, maxAge, format],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['maps'], operation: ['reviews'] } },
		options: [
			country,
			fields,
			language,
			maxAge,
			{
				displayName: 'Number of Reviews',
				name: 'num',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 50 },
				default: 10,
				description: 'Reviews per page (a page holds at most 10)',
			},
			{
				displayName: 'Page Token',
				name: 'page_token',
				// Not a secret: an opaque paging cursor from the previous response.
				// eslint-disable-next-line n8n-nodes-base/node-param-type-options-password-missing
				type: 'string',
				default: '',
				description: 'The next_page_token of the previous page, unchanged',
			},
			format,
		],
	},
];
