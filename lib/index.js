const config = require('../config.json');
const Lcd = require('lcd');
const request = require('request');
const async = require('async');

let lcd = null;


// Config validation
if (!/https:\/\/hook\.integromat\.com\/.+/.test(config.hookUrl))
	throw new Error('Invalid or empty hook url, please check it in config.json');

if (!config.interval)
	throw Error('Please define webhook interval!');


// Initialization of LCD
function startLcd(done) {
	lcd = new Lcd(config.lcd);
	lcd.on('ready', done);
}


// Writing data to LCD
function writeToLcd(data, done) {
	lcd.clear((err) => {
		if (err) return done(err);
		async.series([
			function (next) {
				if (data.row1) {
					lcd.setCursor(0, 0);
					lcd.print(data.row1, next);
				}
			},
			function (next) {
				if (data.row2) {
					lcd.setCursor(0, 1);
					lcd.print(data.row2, next);
				}
			}
		], done);
	});
}


// Calling webhook
function fireHook(done) {
	let opts = {
		url: config.hookUrl,
		method: 'POST',
		json: true,
		body: {}
	};

	request(opts, (err, res, body) => {
		if (err)
			return done(err);

		if (res.statusCode >= 400)
			return done(new Error(`${res.statusCode}: ${body}`));

		done(null, body);
	});
}


function callback(err, body) {
	if (err) throw err;
	console.log(`Received data: ${JSON.stringify(body)}`);
	writeToLcd(body, (err) => {
		if (err) throw err;
		setTimeout(fireHook, config.interval * 1000, callback);
	});
}


console.log('Starting');
startLcd(() => {
	fireHook(callback);
});

process.on('SIGINT', function () {
	lcd.close();
	process.exit();
});
