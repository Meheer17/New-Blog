require('dotenv').config();
const express = require('express')
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const methodOverride = require('method-override');
const blog = require('./Api/blog')
require('./Api/db.js');
const auth = require('./Api/auth');

const app = express();

app.set('view engine', 'pug');
app.use(cors({optionsSuccessStatus: 200}));
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

auth(app)
app.use('/blogs', blog)

app.listen(3000, () => {
  console.log('server started');
});