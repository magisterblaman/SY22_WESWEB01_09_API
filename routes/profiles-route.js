import http from 'http';
import { cleanupHTMLOutput, getRequestBody } from '../utilities.js';
import { dbo } from '../index.js';
import { ObjectId } from 'mongodb';
import fs from 'fs/promises';

/**
 * 
 * @param {string[]} pathSegments 
 * @param {http.IncomingMessage} request 
 * @param {http.ServerResponse} response 
 */
export async function handleProfilesRoute(pathSegments, url, request, response) {
	let nextSegment = pathSegments.shift();
	if (!nextSegment) {
		if (request.method === 'POST') {
			let body = await getRequestBody(request);

			let params = new URLSearchParams(body);

			if (!params.get('profileName') || !params.get('profileEmail')
				|| params.get('profileAge') < 13 || params.get('profileAge') > 99) {

				response.writeHead(400, { 'Content-Type': 'text/plain' });
				response.write('400 Bad Request');
				response.end();
				return;
			}

			let result = await dbo.collection('profiles').insertOne({
				'name': params.get('profileName'),
				'email': params.get('profileEmail'),
				'age': params.get('profileAge')
			});

			response.writeHead(303, { 'Location': '/profiles/' + result.insertedId });
			response.end();
			return;
		}

		if (request.method === 'GET') {
			let filter = {};

			if (url.searchParams.has('age')) {
				filter.age = url.searchParams.get('age');
			}
			if (url.searchParams.has('name')) {
				filter.name = url.searchParams.get('name');
			}

			console.log(filter);

			let documents = await dbo.collection('profiles').find(filter).toArray();

			let profilesString = '';

			for (let i = 0; i < documents.length; i++) {
				profilesString +=
					'<li><a href="/profiles/'
					+ cleanupHTMLOutput(documents[i]._id.toString())
					+ '">'
					+ cleanupHTMLOutput(documents[i].name)
					+ ' ('
					+ cleanupHTMLOutput(documents[i].age)
					+ ')</a></li>';
			}
			let template = (await fs.readFile('templates/profiles-list.volvo')).toString();

			template = template.replaceAll('%{profilesList}%', profilesString);

			response.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
			response.write(template);
			response.end();
			return;
		}

		response.writeHead(405, { 'Content-Type': 'text/plain' });
		response.write('405 Method Not Allowed');
		response.end();
		return;
	}

	if (request.method === 'GET') {
		let profileDocument;
		try {
			profileDocument = await dbo.collection('profiles').findOne({
				"_id": new ObjectId(nextSegment)
			});
		} catch (e) {
			response.writeHead(404, { 'Content-Type': 'text/plain' });
			response.write('404 Not Found');
			response.end();
			return;
		}

		if (!profileDocument) {
			response.writeHead(404, { 'Content-Type': 'text/plain' });
			response.write('404 Not Found');
			response.end();
			return;
		}

		let template = (await fs.readFile('templates/profile.volvo')).toString();

		template = template.replaceAll('%{profileId}%', 
			cleanupHTMLOutput(profileDocument._id.toString()));
		template = template.replaceAll('%{profileName}%', cleanupHTMLOutput(profileDocument.name));
		template = template.replaceAll('%{profileEmail}%', cleanupHTMLOutput(profileDocument.email));
		template = template.replaceAll('%{profileAge}%', cleanupHTMLOutput(profileDocument.age));

		response.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
		response.write(template);
		response.end();
		return;
	}

	if (request.method === 'DELETE') {
		try {
			await dbo.collection('profiles').deleteOne({
				"_id": new ObjectId(nextSegment)
			});
		} catch (e) {
			response.writeHead(404, { 'Content-Type': 'text/plain' });
			response.write('404 Not Found');
			response.end();
			return;
		}

		response.writeHead(204);
		response.end();
		return;
	}


}