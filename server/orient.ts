import * as _ from 'lodash';
import * as OrientDB from 'orientjs';

import {
  TTracker,
  ITrackerItem,
} from 'ancient-tracker/lib/tracker';

import {
  AbstractOverrideTracking,
} from './tracking';

const newDb = async () => {
  const server = OrientDB({
    host: 'localhost',
    port: 2424,
    username: 'root',
    password: 'root',
    useToken: true,
  });

  const dbs = await server.list();
  let db = _.find(dbs, db => db.name === 'research');
  if (!db) db = await server.create('research');

  return db;
};

class OverrideTracking extends AbstractOverrideTracking {
  init(db, time = 250) {
    this.db = db;
    return super.init(time);
  }

  async fetch(query) {
    const results = await this.db.query(`select @rid, @version ${query}`);
    return results;
  }
  
  async toItem(record, newIndex, query, tracker) {
    let data = record;
    const id = data.rid.toString();
    const version = data.version;
    const oldVersion = tracker.memory[id];
    const isChanged = version !== oldVersion;
    if (isChanged) {
      const records = await this.db.query(`select * from ${id}`);
      data = records[0];
    }
    data['@rid'] = id;
    return {
      id, data, newIndex,
      tracker,
      memory: version,
      changed: isChanged,
    };
  }
}

export {
  newDb,
  OverrideTracking,
};
