const Client = require('event-bus/client').default;
const config = require('../../config.json');

let client = null;
module.exports.getClient = function getClient () {
    if (!client) {
        console.log('creating client');
        client = new Client('magicMirror', config);
    }
    return client;
}