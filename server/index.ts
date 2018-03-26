import * as _ from 'lodash';
import * as http from 'http';
import * as IO from 'socket.io';
import * as express from 'express';
const repl = require('repl');

import { Node } from 'ancient-mixins/lib/node';

import {
  Cursor,
} from 'ancient-cursor/lib/cursor';

import {
  AsketicTracker,
} from 'ancient-tracker/lib/asketic-tracker';

import {
  trackerToBundles,
} from 'ancient-tracker/lib/bundles';

import passports from './passports';
import {
  newDb,
  OverrideTracking,
} from './orient';

import {
  newAsk,
} from './tracking';

class App extends Node {
  [key: string]: any;

  async start() {
    this.expressServer = express();
    this.httpServer = http.createServer(this.expressServer);
    this.socketServer = IO(this.httpServer);
    passports(this.expressServer);
    
    this.db = await newDb();
    this.tracking = new OverrideTracking().init(this.db, 250);

    this.httpServer.listen(process.env.PORT);

    this.emit('started', this);
  }
  async destroy() {
    // this.tracking.stop();
    this.httpServer.close();
  }
  whenStarted(callback) {
    if (this.isStarted) callback(this);
    else this.on('started', callback);
  }
}

const app = new App();
app.start();

app.whenStarted(async () => {
  const tracker = new AsketicTracker();

  // await new Promise(r => app.db.exec(
  //   `create table test (id integer primary key autoincrement, value text);`,
  //   () => r(),
  // ));

  tracker.init(newAsk(app, { schema: { fields: {
    select: {
      name: 'select',
      options: {
        sql: `from V;`,
      },
      fill: true,
    },
  }}}));

  const cursor = new Cursor();

  trackerToBundles(tracker, (bundles) => {
    _.each(bundles, b => cursor.apply(b));
    console.log({ select: cursor.data.select });
  });

  await tracker.subscribe();

  const r = repl.start().context.app = app;
});

export {
  App,
  app,
};
