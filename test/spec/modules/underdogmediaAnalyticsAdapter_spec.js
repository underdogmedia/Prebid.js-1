import underdogmediaAnalyticsAdapter from '../../../modules/underdogmediaAnalyticsAdapter';
import adaptermanager from 'src/adapterManager'
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
let bidType = 'Prebid';
let adUnitCode = 'div';
let bidId = 'bidid';
let tId = '7aafa3ee-a80a-46d7-a4a0-cbcba463d97a';
let bidSizeId = 0;
let bidderRequestId = '123bri';

let bidRequested = {
  // auctionId to be passed in and populated in emitEvent()
  bidderCode: bidderCode,
  bidderRequestId: bidderRequestId,
  bids: [
    {
      adUnitCode: adUnitCode,
      bidId: bidId,
      bidder: bidderCode,
      mediaTypes: {
        'banner': {
          sizes: [
            [300, 250],
            [300, 600]
          ]
        }
      },
      transactionId: tId
    }
  ],
  auctionStart: auctionStartTimestamp,
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
  cpm: 99,
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

let bidWon = {
  bidderCode: bidderCode,
  width: 300,
  height: 250,
  statusMessage: 'Bid available',
  cpm: 99,
  adUnitCode: adUnitCode
}

let bidTimeout = {
  bidId: bidId,
  bidder: bidderCode,
  adUnitCode: adUnitCode
}

let auctionEnd = {
  auctionEnd: auctionStartTimestamp + 1000
}

describe.only('Underdog Media Analytics Adapter', function () {
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

  describe('underdogmediaAnalyticsAdapter config', function() {
    beforeEach(() => {
      underdogmediaAnalyticsAdapter.enableAnalytics({
        provider: 'underdogmedia',
        options: {
          pubId: '12431',
          prodType: 'Prebid',
          prebidSiteId: 'pbSiteIdStr',
          prebidSiteName: 'pbSiteNameStr'
        }
      });
      sinon.spy(underdogmediaAnalyticsAdapter, 'track');
    });
    afterEach(() => {
      underdogmediaAnalyticsAdapter.disableAnalytics();
      underdogmediaAnalyticsAdapter.track.restore();
    });
    it('should have correct adapter type', function () {
      assert.equal(underdogmediaAnalyticsAdapter.getAdapterType(), 'endpoint')
    })
  });

  describe('auction event handlers', function() {
    beforeEach(() => {
      underdogmediaAnalyticsAdapter.enableAnalytics({
        provider: 'underdogmedia',
        options: {
          pubId: '12431',
          prodType: 'Prebid',
          prebidSiteId: 'pbSiteIdStr',
          prebidSiteName: 'pbSiteNameStr'
        }
      });
      sinon.spy(underdogmediaAnalyticsAdapter, 'track');
    });
    afterEach(() => {
      underdogmediaAnalyticsAdapter.disableAnalytics();
      underdogmediaAnalyticsAdapter.track.restore();
    });

    it('should initialize auction with auctionId', function () {
      let auctionId = '123.123.123.123';
      emitEvent('AUCTION_INIT', auctionInit, auctionId);

      let auctionData = underdogmediaAnalyticsAdapter.getAuctions();
      let currentAuction = auctionData[auctionId];
      assert(currentAuction);
      assert.equal(currentAuction.auction.auctionId, auctionId);
      expect(currentAuction.auction.start).to.not.equal('');
    });

    it('should populate a bidRequests array', function() {
      let auctionId = '234.234.234.234';
      emitEvent('AUCTION_INIT', auctionInit, auctionId);
      emitEvent('BID_REQUESTED', bidRequested, auctionId);

      let auctionData = underdogmediaAnalyticsAdapter.getAuctions();
      let currentAuction = auctionData[auctionId];
      assert(currentAuction);
      let requests = currentAuction.auction.bidRequests;
      assert(requests);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].bidder, bidderCode);
      assert.equal(requests[0].bidType, bidType);
      assert.equal(requests[0].timedOut, null);
      expect(requests[0]).to.not.have.property('took');

      let bidUnits = requests[0].bidUnits;
      assert(bidUnits);
      assert.equal(bidUnits.length, 1);
      assert.equal(bidUnits[0].adUnitId, adUnitCode);

      let bidSizes = bidUnits[0].sizes;
      assert.equal(bidSizes.length, 2);
      assert.equal(bidSizes[0].id, bidSizeId)
      expect(bidSizes[0]).to.not.have.property('cpm');
      expect(bidSizes[0]).to.not.have.property('won');
    });

    it('should add appropriate response props to bidRequests', function () {
      let auctionId = '345.345.345.345';
      emitEvent('AUCTION_INIT', auctionInit, auctionId);
      emitEvent('BID_REQUESTED', bidRequested, auctionId);
      emitEvent('BID_RESPONSE', bidResponse, auctionId);

      let auctionData = underdogmediaAnalyticsAdapter.getAuctions();
      let currentAuction = auctionData[auctionId];
      let bidRequest = currentAuction.auction.bidRequests[0];

      expect(bidRequest).to.have.property('took');
      assert.equal(bidRequest.bidRecvCnt, 1)
    });

    it('should add appropriate props to winnning bid', function () {
      let auctionId = '456.456.456.456';
      emitEvent('AUCTION_INIT', auctionInit, auctionId);
      emitEvent('BID_REQUESTED', bidRequested, auctionId);
      emitEvent('BID_RESPONSE', bidResponse, auctionId);
      emitEvent('BID_WON', bidWon, auctionId);

      let auctionData = underdogmediaAnalyticsAdapter.getAuctions();
      let currentAuction = auctionData[auctionId];
      let bidSize = currentAuction.auction.bidRequests[0].bidUnits[0].sizes[0];

      assert.equal(bidSize.won, true)
    });

    it('should handle bidTimeout event by adding timedOut prop', function () {
      let auctionId = '567.567.567.567';
      emitEvent('AUCTION_INIT', auctionInit, auctionId);
      emitEvent('BID_REQUESTED', bidRequested, auctionId);
      emitEvent('BID_TIMEOUT', bidTimeout, auctionId);

      let auctionData = underdogmediaAnalyticsAdapter.getAuctions();
      let currentAuction = auctionData[auctionId];
      let bidRequest = currentAuction.auction.bidRequests[0];

      assert.equal(bidRequest.timedOut, true)
    });

    it('should handle auctionEnd event by deleting appropriate props and sending payload', function () {
      let auctionId = '678.678.678.678';
      emitEvent('AUCTION_INIT', auctionInit, auctionId);
      emitEvent('BID_REQUESTED', bidRequested, auctionId);
      emitEvent('BID_RESPONSE', bidResponse, auctionId);
      emitEvent('BID_WON', bidWon, auctionId);
      emitEvent('AUCTION_END', auctionEnd, auctionId);

      let auctionData = underdogmediaAnalyticsAdapter.getAuctions();
      let currentAuction = auctionData[auctionId];

      assert.equal(currentAuction.auctionId, auctionId)
      assert.equal(currentAuction.status, 'complete')
      // expect(currentAuction.auction).to.not.have.property('adUnitIdMapper');
      // expect(currentAuction.auction).to.not.have.property('auctionId');
      // expect(currentAuction.auction).to.not.have.property('start');
      // expect(currentAuction.auction).to.not.have.property('end');
    });
  });
});
