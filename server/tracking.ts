import * as _ from 'lodash';

import { Node } from 'ancient-mixins/lib/node';

import {
  TTracker,
  ITrackerItem,
} from 'ancient-tracker/lib/tracker';

import {
  IAsketicTrackerAsk,
} from 'ancient-tracker/lib/asketic-tracker';

abstract class AbstractOverrideTracking extends Node {
  init(time = 250) {
    this.time = time;
    const interval = setInterval(() => this.iterator(), this.time);
    this.once('destroy', () => clearInterval(interval));
    return this;
  }
  
  abstract fetch(query): Promise<any>;
  abstract toItem(document, index, query, tracker): Promise<ITrackerItem>;

  trackings = [];

  track(query) {
    return async (tracker) => {
      const tracking = { query, tracker };
      this.trackings.push(tracking);
      this.override(tracking);
      return async () => _.remove(this.trackings, t => t.tracker === tracker);
    };
  }

  async override(traking) {
    const { query, tracker } = traking;
    const records = await this.fetch(query);
    const data = await Promise.all(_.map(records, (d,i) => this.toItem(d, i, query, tracker)));
    tracker.override(data);
  }

  iterator() {
    _.each(this.trackings, async (tracking) => {
      this.override(tracking);
    });
  }
}

const newAsk = (
  app,
  query,
): IAsketicTrackerAsk => async (asketicTracker) => {
  const resolver = async (flow) => {
    if (flow.env.type === 'items') {
      return asketicTracker.resolveItemData(flow, flow.data.data);
    }

    if (flow.env.name === 'select') {
      const tracker = await asketicTracker.track(flow);
      
      const trackerAddedListener = item => items.splice(item.newIndex, 0, item);
      const sql = _.template(_.get(flow, 'schema.options.sql'))(_.get(flow, 'env.item.data'));
      tracker.init(app.tracking.track(sql));
      
      const items = [];
      tracker.on('added', trackerAddedListener);
      await tracker.subscribe();
      tracker.off('added', trackerAddedListener);
      if (_.get(flow, 'schema.options.subscribe') === false) {
        await tracker.unsubscribe();
      }

      return asketicTracker.resolveItemsArray(flow, items);
    }

    return asketicTracker.resolveDefault(flow);
  };
  
  return await asketicTracker.asket({
    query,
    resolver: asketicTracker.createResolver(resolver),
  });
};

export {
  AbstractOverrideTracking,
  newAsk,
};
