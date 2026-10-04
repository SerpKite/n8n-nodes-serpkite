import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SerpKiteApi implements ICredentialType {
	name = 'serpKiteApi';
	icon: Icon = 'file:../nodes/SerpKite/serpkite.svg';
	displayName = 'SerpKite API';
	documentationUrl = 'https://serpkite.com/docs';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your complete skt_live_ API key from app.serpkite.com',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: { headers: { Authorization: '=Bearer {{$credentials.apiKey}}' } },
	};
	test: ICredentialTestRequest = {
		request: { baseURL: 'https://api.serpkite.com', url: '/v1/account', method: 'GET' },
	};
}
