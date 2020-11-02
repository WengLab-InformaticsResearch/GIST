const { crit2query: read_trial } = require("./crit2query");
const { Client } = require("pg");

const fs = require("fs");

// CONNECTING TO POSTGRES DATABASE
const client = new Client({
	user: "postgres",
	host: "localhost",
	password: "****",
	database: "****",
	port: "****"
});

client.connect(err => {
	if (err) {
		console.error(`connection error: \n\t`, err.stack);
	}
});

let beaut = {
	beatiful_query: "",
	beatiful_input: []
};

// MAKING QUERY AND INPUT JSON FOR API
client
	.query("select * from gist_test.sample_ec;")
	.then(res => {
		[beaut.beatiful_query, beaut.beatiful_input] = read_trial(res.rows);
		console.log(JSON.stringify(beaut))
		// make an https get request to the api
	})
	.catch(err => console.error(err.stack))
	.then(() => {
		client.end();
	});
