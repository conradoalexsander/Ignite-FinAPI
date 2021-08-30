const { json } = require('express');
const express = require('express');

const app = express();

app.use(json());

app.listen(3333);