const express = require("express");
const bodyParser = require("body-parser");

const { Client } = require("pg");
const gist = require("./gist");

const app = express();
const port = 3000;

app.use(bodyParser.json());

app.get("/", (req, res) => {
	let input = req.body;

	const client = new Client({
		user: "****",
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

	client
		.query(input.beatiful_query)
		.then(results => {
			const [output, patient_data, m, s] = gist.main(
				input.beatiful_input,
				results.rows
			);
			res.send({
				output: output,
				mGIST: m
			});
		})
		.catch(err => console.error(err.stack))
		.then(() => {
			client.end();
		});
});

app.listen(port, () => console.log("HEYYO WORLD, SERVER RUNNING ON PORT 3000"));
