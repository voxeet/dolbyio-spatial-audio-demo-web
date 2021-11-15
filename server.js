const express = require('express');
const https = require('https');
const { Command } = require('commander');
const dotenv = require('dotenv');

const app = express();
const program = new Command();

dotenv.config();

// Parse POST requests as JSON payload
app.use(express.json());

// Serve static files
app.use(express.static('src'));

const CONSUMER_KEY = process.env.CONSUMER_KEY ?? '';
const CONSUMER_SECRET = process.env.CONSUMER_SECRET ?? '';
const OAUTH_SERVER = process.env.OAUTH_SERVER ?? 'session.voxeet.com';

if (CONSUMER_KEY.length <= 0 || CONSUMER_SECRET.length <= 0) {
    throw new Error('The Consumer Key and/or Secret are missing!');
}

/**
 * Sends a POST request
 * @param {string} hostname
 * @param {string} path
 * @param {*} headers
 * @param {string} body
 * @returns A JSON payload object through a Promise.
 */
const postAsync = (hostname, path, headers, body) => {
    return new Promise(function (resolve, reject) {
        const options = {
            hostname: hostname,
            port: 443,
            path: path,
            method: 'POST',
            headers: headers,
        };

        const req = https.request(options, (res) => {
            console.log(`[POST] ${res.statusCode} - https://${hostname}${path}`);

            let data = '';
            res.on('data', (chunk) => {
                data = data + chunk.toString();
            });

            res.on('end', () => {
                const json = JSON.parse(data);
                resolve(json);
            });
        });

        req.on('error', (error) => {
            console.error('error', error);
            reject(error);
        });

        req.write(body);
        req.end();
    });
};

/**
 * Gets a JWT token for authorization.
 * @param {string} hostname
 * @param {string} path
 * @returns a JWT token.
 */
const getAccessTokenAsync = (hostname, path) => {
    const body = 'grant_type=client_credentials';

    const authz = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');

    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
        Authorization: `Basic ${authz}`,
        'Content-Length': body.length,
    };

    return postAsync(hostname, path, headers, body);
};

app.get('/access-token', async (request, response) => {
    console.log(`[GET] ${request.url}`);

    try {
        // See: https://docs.dolby.io/communications-apis/reference/postoauthtoken
        const accessToken = await getAccessTokenAsync(OAUTH_SERVER, '/v1/oauth2/token');
        
        response.set('Content-Type', 'application/json');
        response.status(200).send(JSON.stringify(accessToken, null, '  '));
    } catch (error) {
        console.error(error);
        response.status(500).send('An error happened.');
    }
});

// Extract the port number from the command argument
program.option('-p, --port <portNumber>', 'Port number to start the HTTP server on.');
program.parse(process.argv);

let portNumber = 8081; // Default port number
const options = program.opts();
if (options.port) {
    const p = parseInt(options.port, 10);
    if (!isNaN(p)) {
        portNumber = p;
    }
}

// Starts an HTTP server
const server = app.listen(portNumber,'localhost', function () {
    const address = server.address();
    console.log('Dolby.io Spatial Audio application is now listening at http://%s:%s', address.address, address.port);
});
