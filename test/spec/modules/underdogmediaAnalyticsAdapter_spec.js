import underdogmediaAnalyticsAdapter from '../../../modules/sovrnAnalyticsAdapter'
import {
  expect
} from 'chai'
import {
  config
} from 'src/config'
import adaptermanager from 'src/adapterManager'
var assert = require('assert');

let events = require('src/events');
let constants = require('src/constants.json');

/**
 * Emit analytics events
 * @param {array} eventArr - array of objects to define the events that will fire
 *    @param {object} eventObj - key is eventType, value is event
 * @param {string} auctionId - the auction id to attached to the events
 */
function emitEvent(eventType, event, auctionId) {
  event.auctionId = auctionId;
  events.emit(constants.EVENTS[eventType], event);
}

describe('Underdog Media Analytics Adapter', function () {
  let xhr;
  let requests;
  beforeEach(() => {
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = request => requests.push(request);
    requests = [];
    sinon.stub(events, 'getEvents').returns([]);
  });
  afterEach(() => {
    xhr.restore();
    events.getEvents.restore();
  });

  describe('enableAnalytics ', function () {
    beforeEach(() => {
      sinon.spy(underdogmediaAnalyticsAdapter, 'track');
    });
    afterEach(() => {
      sovrnAnalyticsAdapter.disableAnalytics();
      sovrnAnalyticsAdapter.track.restore();
    });

    it('should catch all events if affiliate id present', function () {
      adaptermanager.enableAnalytics({
        provider: 'underdogmedia',
        options: {
          siteId: '12143'
        }
      });

      events.emit(constants.EVENTS.AUCTION_INIT, {});
      events.emit(constants.EVENTS.AUCTION_END, {});
      events.emit(constants.EVENTS.BID_REQUESTED, {});
      events.emit(constants.EVENTS.BID_RESPONSE, {});
      events.emit(constants.EVENTS.BID_WON, {});

      sinon.assert.callCount(sovrnAnalyticsAdapter.track, 5);
    });

    it('should catch no events if no affiliate id', function () {
      adaptermanager.enableAnalytics({
        provider: 'sovrn',
        options: {
        }
      });

      events.emit(constants.EVENTS.AUCTION_INIT, {});
      events.emit(constants.EVENTS.AUCTION_END, {});
      events.emit(constants.EVENTS.BID_REQUESTED, {});
      events.emit(constants.EVENTS.BID_RESPONSE, {});
      events.emit(constants.EVENTS.BID_WON, {});

      sinon.assert.callCount(sovrnAnalyticsAdapter.track, 0);
    });
  });
})
