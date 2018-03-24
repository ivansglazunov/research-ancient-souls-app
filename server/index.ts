import * as _ from 'lodash';
import * as http from 'http';
import * as IO from 'socket.io';
import * as express from 'express';

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
  SqliteOverrideTracking,
} from './sqlite3';
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
    this.tracking = new SqliteOverrideTracking().init(this.db);

    this.httpServer.listen(process.env.PORT);

    this.emit('started', this);
  }
  async destroy() {
    this.tracking.stop();
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

  await new Promise(r => app.db.exec(
    `create table test (id integer primary key autoincrement, value text);`,
    () => r(),
  ));

  tracker.init(newAsk(app, { schema: { fields: {
    insert: {
      name: 'select',
      options: {
        sql: `insert into test (value) values ("abc");`,
        subscribe: false,
      },
    },
    select: {
      name: 'select',
      options: {
        sql: `select * from test;`,
      },
      fill: true,
    },
  }}}));

  const cursor = new Cursor();
  trackerToBundles(tracker, (bundles) => {
    _.each(bundles, b => cursor.apply(b));
  });
  await tracker.subscribe();
  setInterval(() => console.log(cursor.data.select), 1000);
});

export {
  App,
  app,
};
