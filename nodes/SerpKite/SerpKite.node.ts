import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';
import { SerpKiteV1 } from './SerpKiteV1.node';
import { SerpKiteV2 } from './SerpKiteV2.node';

// Version 1 (search, news, webpage) stays as published in 0.1.0 so existing
// workflows keep working; new nodes get version 2.
export class SerpKite extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'SerpKite',
			name: 'serpKite',
			icon: 'file:serpkite.svg',
			group: ['transform'],
			subtitle: '={{$parameter["operation"]}}',
			description:
				'Search Google and its verticals, read and crawl webpages, get cited AI answers and research, and ask AI assistants',
			defaultVersion: 2,
		};
		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new SerpKiteV1(),
			2: new SerpKiteV2(),
		};
		super(nodeVersions, baseDescription);
	}
}
