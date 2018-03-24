import * as _ from 'lodash';
import { Database } from 'sqlite3';
const sqlite3 = require('sqlite3').verbose();

import {
  TTracker,
  ITrackerItem,
} from 'ancient-tracker/lib/tracker';

import {
  AbstractOverrideTracking,
} from './tracking';

const newDb = () => {
  const db = new sqlite3.Database(':memory:');
  return new Promise(resolve => db.serialize(() => resolve(db)));
};

class SqliteOverrideTracking extends AbstractOverrideTracking {
  init(db, time = 250) {
    this.db = db;
    return super.init(time);
  }

  fetch(query) {
    return new Promise((res,rej) => this.db.all(query, (e,r) => e ? rej(e) : res(r)));
  }
  
  toItem(data, newIndex, query, tracker) {
    const id = data.id;
    const oldVersion = tracker.memory[data.id];
    const isChanged = !_.isEqual(data, (oldVersion || {}));
    return {
      id, data, newIndex,
      tracker,
      memory: data,
      changed: isChanged,
    };
  }
}

export {
  newDb,
  SqliteOverrideTracking,
};
