const express = require('express')
const mongoose = require('mongoose')
const bodyParse = require('body-parser')
const path = require('path')
const cors = require('cors')
const passport = require('passport')
const { generalLimiter, authLimiter, smsLimiter } = require('./middleware/rateLimit')
const requestLoggingMiddleware = require('./middleware/requestLogger')

// init
const app = express()

// Form data middleware
app.use(bodyParse.urlencoded({
    extended: false
}))

// Json body middleware
app.use(bodyParse.json())

app.use(cors())

// Apply request logging middleware to all routes
app.use(requestLoggingMiddleware())

// Apply general rate limiter to all routes
app.use(generalLimiter)

// setting static directory
app.use(express.static(path.join(__dirname, 'public')))

// user passport middleware
app.use(passport.initialize())
// JWT Strartegy
require('./config/passport')(passport)


// Connect to DB
const db = require('./config/keys').mongo_uri
mongoose.connect(db, {
    useNewUrlParser: true
}).then(() => {
    console.log(`Database connected successfully ${db}`)
}).catch(err => {
    console.error(`Unable to connect with the database ${err}`)
})

app.get('/', (req, res) => {
    return res.send('api')
})

const users = require('./routes/api/users')
// Apply strict auth limiter to user routes
app.use('/api/users', authLimiter, users)

const sms = require('./routes/api/sms')
// Apply SMS limiter to SMS routes
app.use('/api/sms', smsLimiter, sms)

const logs = require('./routes/api/logs')
// Apply auth limiter to logs routes (should be restricted to admin in production)
app.use('/api/logs', authLimiter, logs)


app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'))
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
    console.log(`Server started on port: ${PORT}`)
})