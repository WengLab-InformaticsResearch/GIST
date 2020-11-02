const { elig_traits, main_program } = require("./main_program");

var fs = require('fs');
var mysql = require('mysql');

// READ INPUT
var input = JSON.parse(fs.readFileSync('input2.json', 'utf8'));
exports.input = input;

// CONNECT SQL DATABASE
var con = mysql.createConnection({
	host: '127.0.0.1',
	port: '3306',
	user: 'root',
	password: 'herschel',
	database: 'population',
	insecureAuth: true
});

con.connect(err => {
	if (err) throw err;
});

// QUERY SQL DATABASE
con.query('select ' + elig_traits() + ' from dummy_pop;', (err, res) => {
	if (err) throw err;
	main_program(res);
});

con.end();
