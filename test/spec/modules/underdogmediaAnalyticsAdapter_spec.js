import underdogmediaAnalyticsAdapter from '../../../modules/underdogmediaAnalyticsAdapter';
import { config } from 'src/config'
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

  describe('underdogmediaAnalyticsAdapter ', function() {
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
    it('should have correct type', function () {
      assert.equal(underdogmediaAnalyticsAdapter.getAdapterType(), 'endpoint')
    })
  });

  describe('auction data collector ', function() {
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

    it('should create auctiondata record from init ', function () {
      let auctionId = '123.123.123.123';
      emitEvent('AUCTION_INIT', auctionInit, auctionId);

      let auctionData = underdogmediaAnalyticsAdapter.getAuctions();
      console.log(`auctionData: ${JSON.stringify(auctionData, null, 1)}`)
      let currentAuction = auctionData[auctionId];
      assert(currentAuction);
      let expectedTimeOutData = {
        buffer: config.getConfig('timeoutBuffer'),
        bidder: config.getConfig('bidderTimeout'),
      };
      expect(currentAuction.auction.timeouts).to.deep.equal(expectedTimeOutData);
      assert.equal(currentAuction.auction.auctionId, auctionId);
    });

    it('should create a bidrequest object ', function() {
      let auctionId = '234.234.234.234';
      emitEvent('AUCTION_INIT', auctionInit, auctionId);
      emitEvent('BID_REQUESTED', bidRequested, auctionId);

      let auctionData = underdogmediaAnalyticsAdapter.getAuctions();
      let currentAuction = auctionData[auctionId];
      assert(currentAuction);
      let requests = currentAuction.auction.bidRequests;
      assert(requests);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].bidderCode, bidderCode);
      assert.equal(requests[0].bidderRequestId, bidderRequestId);
      assert.equal(requests[0].timeout, timeout);
      let bids = requests[0].bidUnits;
      assert(bids);
      assert.equal(bids.length, 2);
      assert.equal(bids[0].bidId, bidId);
      assert.equal(bids[0].bidderCode, bidderCode);
      assert.equal(bids[0].transactionId, tId);
      assert.equal(bids[0].sizes.length, 1);
      assert.equal(bids[0].sizes[0][0], 300);
      assert.equal(bids[0].sizes[0][1], 250);
      expect(requests[0]).to.not.have.property('doneCbCallCount');
      expect(requests[0]).to.not.have.property('auctionId');
    });
    it('should add results to the bid with response ', function () {
      let auctionId = '345.345.345.345';
      emitEvent('AUCTION_INIT', auctionInit, auctionId);
      emitEvent('BID_REQUESTED', bidRequested, auctionId);
      emitEvent('BID_RESPONSE', bidResponse, auctionId);

      let auctionData = underdogmediaAnalyticsAdapter.getAuctions();
      let currentAuction = auctionData[auctionId];
      let returnedBid = currentAuction.auction.bidRequests[0].bidUnits[0];
      assert.equal(returnedBid.bidId, bidId);
      assert.equal(returnedBid.bidder, bidderCode);
      assert.equal(returnedBid.transactionId, tId);
      assert.equal(returnedBid.sizes.length, 1);
      assert.equal(returnedBid.sizes[0][0], 300);
      assert.equal(returnedBid.sizes[0][1], 250);
      assert.equal(returnedBid.adserverTargeting.hb_adid, '3870e27a5752fb');
      assert.equal(returnedBid.adserverTargeting.hb_bidder, bidderCode);
      assert.equal(returnedBid.adserverTargeting.hb_pb, '0.85');
      assert.equal(returnedBid.cpm, 0.8584999918937682);
    });
  });
})
