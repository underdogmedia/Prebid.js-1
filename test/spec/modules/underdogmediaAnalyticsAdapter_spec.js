import underdogmediaAnalyticsAdapter from '../../../modules/underdogmediaAnalyticsAdapter';
let adaptermanager = require('src/adapterManager').default;
let assert = require('assert');
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

let auctionStartTimestamp = Date.now();
let timeout = 3000;
let auctionInit = {
  timestamp: auctionStartTimestamp,
  timeout: timeout
};

let bidderCode = 'underdogmedia';
let bidderRequestId = '123bri';
let adUnitCode = 'div';
let adUnitCode2 = 'div2';
let bidId = 'bidid';
let bidId2 = 'bidid2';
let tId = '7aafa3ee-a80a-46d7-a4a0-cbcba463d97a';
let tId2 = '99dca3ee-a80a-46d7-a4a0-cbcba463d97e';

let bidRequested = {
  auctionStart: auctionStartTimestamp,
  bidderCode: bidderCode,
  bidderRequestId: bidderRequestId,
  bids: [
    {
      adUnitCode: adUnitCode,
      bidId: bidId,
      bidder: bidderCode,
      bidderRequestId: '10340af0c7dc72',
      sizes: [[300, 250]],
      startTime: auctionStartTimestamp + 100,
      transactionId: tId
    },
    {
      adUnitCode: adUnitCode2,
      bidId: bidId2,
      bidder: bidderCode,
      bidderRequestId: '10340af0c7dc72',
      sizes: [[300, 250]],
      startTime: auctionStartTimestamp + 100,
      transactionId: tId2
    }
  ],
  doneCbCallCount: 1,
  start: auctionStartTimestamp,
  timeout: timeout
};

let bidResponse = {
  bidderCode: bidderCode,
  width: 300,
  height: 250,
  statusMessage: 'Bid available',
  adId: '3870e27a5752fb',
  mediaType: 'banner',
  source: 'client',
  requestId: bidId,
  cpm: 0.8584999918937682,
  creativeId: 'cridprebidrtb',
  dealId: null,
  currency: 'USD',
  netRevenue: true,
  ad: '<div>divvy mcdiv</div>',
  ttl: 60000,
  responseTimestamp: auctionStartTimestamp + 150,
  requestTimestamp: auctionStartTimestamp + 100,
  bidder: bidderCode,
  adUnitCode: adUnitCode,
  timeToRespond: 50,
  pbLg: '0.50',
  pbMg: '0.80',
  pbHg: '0.85',
  pbAg: '0.85',
  pbDg: '0.85',
  pbCg: '',
  size: '300x250',
  adserverTargeting: {
    hb_bidder: bidderCode,
    hb_adid: '3870e27a5752fb',
    hb_pb: '0.85'
  },
  status: 'rendered'
};

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

  describe('enableAnalytics', function () {
    beforeEach(() => {
      sinon.spy(underdogmediaAnalyticsAdapter, 'track');
    });
    afterEach(() => {
      underdogmediaAnalyticsAdapter.disableAnalytics();
      underdogmediaAnalyticsAdapter.track.restore();
    });

    it('should catch all events if appropriate options are set', function () {
      adaptermanager.enableAnalytics({
        provider: 'underdogmedia',
        options: {
          pubId: '12143',
          prodType: 'Prebid',
          prebidSiteId: 'pbSiteIdStr',
          prebidSiteName: 'pbSiteNameStr'
        }
      });

      let auctionId = '123.123.123.123';
      emitEvent('AUCTION_INIT', auctionInit, auctionId);
      emitEvent('BID_REQUESTED', bidRequested, auctionId);
      emitEvent('BID_RESPONSE', bidResponse, auctionId);

      sinon.assert.callCount(underdogmediaAnalyticsAdapter.track, 3);
    });

    it('should catch no events if appropriate options aren\'t set', function () {
      adaptermanager.enableAnalytics({
        provider: 'underdogmedia',
        options: {}
      });

      let auctionId = '123.123.123.123';
      emitEvent('AUCTION_INIT', auctionInit, auctionId);
      emitEvent('BID_REQUESTED', bidRequested, auctionId);
      emitEvent('BID_RESPONSE', bidResponse, auctionId);

      sinon.assert.callCount(underdogmediaAnalyticsAdapter.track, 0);
    });
  });
})
