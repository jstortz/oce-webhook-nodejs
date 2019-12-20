const express = require('express')
const helmet = require('helmet')
const path = require('path')
const bodyParser = require('body-parser')
const cors = require('cors')
const { Pool } = require('pg')

const PORT = process.env.PORT || 5000
const isProduction = process.env.NODE_ENV === 'production'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction,
})

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())
app.use(helmet())

// return all events in db 
const getEvents = async (req, res) => {
	try {
		const client = await pool.connect()
		const result = await client.query('SELECT * FROM asset_event');
		const results = { 'results': (result) ? result.rows : null};
		res.status(200).json(results)
		client.release();
	} catch (err) {
		console.error('* webhook get error:\n' + err);
		res.status(500).send({ error: 'Existential server error' })
	}
}

// save webhook event to db 
const webhookPost = async (req, res) => {
	try {
		console.log('** debug')
		console.log(JSON.stringify(req.body.entity.items))

		// validate the payload schema
		if (!req.body.event.id || !req.body.event.name || !req.body.event.initiatedBy || !req.body.entity.id) {
			res.status(400).send({ status: 400, error: 'Request not properly formed' })
		}
		else {
			try {
				const client = await pool.connect()
				const result = await client.query('INSERT INTO asset_event (event_id, event_type, content_id, user_id) VALUES ($1, $2, $3, $4)', [req.body.event.id, req.body.event.name, req.body.entity.id, req.body.event.initiatedBy]);
				console.log('* Inserted new event')
				res.status(201).json({status: 201})
			} catch (err) {
				console.error('** webhook post insert error:\n' + err);
				res.status(400).send({ status: 500, error: 'Could not process request' })
			}
		}
	} catch (err) {
		console.error('* webhook post error:\n' + err);
		res.status(500).send({ status: 500, error: 'Existential server error' })
	}
}

app
  .get('/api/events', getEvents)
  .post('/webhook', webhookPost)
  .listen(PORT, () => console.log(`OCE Webook Node.js listening on ${ PORT }`))