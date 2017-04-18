// configuration
var config = {};
config.name = require('./package.json').name;
config.version = require('./package.json').version;
config.net = {};
config.net.port = 3000;
config.net.protocol = 'http'
config.net.host = 'localhost';

const debug = require('debug')(config.name + ' |');
debug('Configuration: %s', JSON.stringify(config));

var config_scidb = require('./config.js');
debug('SciDB digest auth config: %s', JSON.stringify(config_scidb));
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const fs = require('fs');
const compression = require('compression');
const shortid = require('shortid');
const exec = require('child_process').exec;

var digestRequest = require('request-digest')(config_scidb.user, config_scidb.passwd);

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(compression());
app.use(bodyParser.json());

app.use((req, res, next) => {
  debug(req.method + ' ' + req.path);
  next();
});

// data database
var data = new Array();

// processes database
var processes = {};
processes.addition = {
  name: 'addition',
  author: 'daniel',
  backend: config.name,
  inputs: 2,
  outputs: 1
}

// jobs database
var jobs = {};

// utility functions
getPublicProcessIdentifier = (id) => {
  return (config.net.protocol + '://' + config.net.host + ':' + config.net.port + '/process/' + id);
}

translateBandname = (nameInRequest) => {
  // red = band1, green = band2, blue = band3
  switch (nameInRequest) {
    case "/data/S2A_1/red":
      return ("band1");
      break;
    case "/data/S2A_1/green":
      return ("band2");
      break;
    case "/data/S2A_1/blue":
      return ("band3");
      break;
    default:
      return (null);
  }
}

// routes
app.get('/process', function (req, res) {
  debug('GET processes');

  res.setHeader('Content-Type', 'application/json');
  let response = { processes: processes };
  res.send(response);
});
app.get('/process/:id', function (req, res) {
  let id = req.params.id;
  debug('GET process %s', id);

  res.setHeader('Content-Type', 'application/json');
  if (processes[id] == undefined) {
    res.status(404).send({ error: 'process id ' + id + ' not found!' });
  } else {
    let response = { process: processes[id] };
    res.send(response);
  }
});

app.post('/process/:id', function (req, res) {
  let process = req.params.id;
  let id = shortid.generate();
  debug('POST process %s with new id and content %s', process, id, req.body);

  jobs[id] = {
    id: id,
    process: getPublicProcessIdentifier(process)
  };

  var request_band1 = req.body.band1;
  var request_band2 = req.body.band2;
  var request_output = req.body.output;

  // https://htmlpreview.github.io/?https://raw.github.com/Paradigm4/shim/master/wwwroot/help.html
  // get session id
  digestRequest.request({
    host: config_scidb.host,
    path: '/new_session',
    port: config_scidb.port,
    method: 'GET'
  }, function (error, response, body) {
    if (error) {
      debug('ERROR: %s', error);
    }

    let session_id = parseInt(body);
    if (!session_id) {
      res.status(500).send('no session id from shim');
    } else {
      // build query
      let input_array = 'S2A_1'; // "ID" in path "/data/ID/red"

      let band1 = translateBandname(request_band1);
      let band2 = translateBandname(request_band2);

      // create output dataset internal reference
      data[request_output] = {
        file: id + '.tif',
        layer: 'output_' + shortid.generate().replace('_', '').replace('-', '')
      }

      let output_array = data[request_output].layer;

      // TODO validate band1 and band2

      let query1 = encodeURIComponent('store(project(apply(' + input_array + ', sum, ' + band1 + '+' + band2 + '), sum), ' + output_array + ')');
      let query2 = encodeURIComponent('eo_setsrs(' + output_array + ',' + input_array + ')');

      // execute query
      debug('query1: %s', query1);
      digestRequest.request({
        host: config_scidb.host,
        path: '/execute_query?id=' + session_id + '&query=' + query1,
        port: config_scidb.port,
        method: 'GET'
      }, function (error, response, body) {
        if (error) {
          debug('ERROR: %s', error);
        } else {
          debug('completed first query, response is %s', body);

          // second query
          debug('query2: %s', query2);
          digestRequest.request({
            host: config_scidb.host,
            path: '/execute_query?id=' + session_id + '&query=' + query2,
            port: config_scidb.port,
            method: 'GET'
          }, function (error, response, body) {
            if (error) {
              debug('ERROR: %s', error);
            } else {
              debug('completed second query, response is %s', body);

              // get data via gdal, see also http://www.gdal.org/gdal_translate.html
              let cmd = 'gdal_translate -of "GTiff" -oo "host=' + config_scidb.host +
                '" -oo "port=' + config_scidb.port +
                '" -oo "user=' + config_scidb.user +
                '" -oo "password=' + config_scidb.passwd +
                // TODO remove fixed srcwin
                '" -srcwin 0 0 500 500 ' +
                '"SCIDB:array=' + output_array + '" ' +
                data[request_output].file;
              debug('calling GDAL with %s', cmd);

              exec(cmd, (error, stdout, stderr) => {
                if (error) {
                  console.error(`exec error: ${error}`);
                  return;
                }
                debug(`stdout: ${stdout}`);
                debug(`stderr: ${stderr}`);

                debug('created output file for %s: %s', request_output, JSON.stringify(data[request_output]));
              });
            }
          });
        }
      });
    }
  });

  res.setHeader('Content-Type', 'application/json');
  let response = {job: id};
  debug('POST /process complete: %s', JSON.stringify(response));
  res.send(response);
});

app.get('/data/:group/:name', function (req, res) {
  let group = req.params.group;
  let name = req.params.name;
  let id = '/data/' + group + '/' + name;
  debug('serving data for request "%s" using item "%s"', req.path, id);

  var img = fs.readFileSync(data[id].file);
  res.writeHead(200, { 'Content-Type': 'image/tif' }); // image/tiff is correct but opens image viewer while image/tif opens QGIS
  res.end(img, 'binary');
});

app.get('/status', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  let response = {
    service: config.name,
    version: config.version
  };
  res.send(response);
});

app.listen(config.net.port, () => {
  debug(config.name + ' ' + config.version + ' waiting for requests on port ' + config.net.port);
});
