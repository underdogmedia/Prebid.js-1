import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';
import CONSTANTS from '../src/constants.json';
import * as utils from '../src/utils';
let pbVersion = require('../package.json').version
// import { ajax } from '../src/ajax';

// const url = 'underdog_media_url';

// Prebid events needed
const {
  EVENTS: {
    AUCTION_INIT,
    BID_REQUESTED,
    BID_TIMEOUT,
    BID_RESPONSE,
    BID_WON,
    AUCTION_END
  }
} = CONSTANTS;

// holds auction id's for auctions currently taking place
let currentAuctions = {}

let underdogmediaAnalyticsAdapter = Object.assign(adapter({analyticsType: 'endpoint'}),
  {
    track({ eventType, args }) {
      try {
        if (args && args.auctionId && currentAuctions[args.auctionId] === undefined) {
          currentAuctions[args.auctionId] = new Auction(this.prebidSiteId, this.prebidSiteName, args.auctionId)
        }
        switch (eventType) {
          case AUCTION_INIT:
            currentAuctions[args.auctionId].auctionInit(args)
            break;
          case BID_REQUESTED:
            currentAuctions[args.auctionId].bidRequested(args)
            break;
          case BID_RESPONSE:
            currentAuctions[args.auctionId].bidResponse(args)
            break;
          case BID_WON:
            currentAuctions[args.auctionId].bidWon(args)
            break;
          case BID_TIMEOUT:
            currentAuctions[args.auctionId].bidTimeout(args)
            break;
          case AUCTION_END:
            setTimeout(function () { currentAuctions[args.auctionId].send() }, 3100);
            break;
          default:
            break;
        }
      } catch (e) {
        new LogError(e, {eventType, args}).send()
      }
    }
  });

class Auction {
  /**
   * Creates a new instance for separate auctions
   * @param {string} prebidSiteId - site specific id
   * @param {string} prebidSiteName - site specific name
   * @param {string} auctionId- unique id for each auction
   */
  constructor(prebidSiteId, prebidSiteName, auctionId) {
    this.auction = {}
    this.auction.reqType = 'Prebid'
    this.auction.prebidSiteId = prebidSiteId
    this.auction.prebidSiteName = prebidSiteName
    this.auction.auctionId = auctionId
    this.auction.url = utils.getTopWindowLocation().href
    this.auction.adUnits = []
    this.auction.bidRequests = []
    this.auction.adUnitIdMapper = []
    this.auction.udmInternal = {
      prodType: 'Prebid',
      clientVers: pbVersion
    }
  }

  auctionInit(args) {

  }

  bidRequested(args) {
    let bidReq = {
      bidder: args.bidderCode,
      bidType: 'Prebid',
      bidRecvCnt: 0,
      bidUnits: []
    }
    args.bids.forEach(bid => {
      let bidUnit = {
        adUnitId: bid.adUnitCode,
        sizes: [{
          won: false
        }]
      }
      bidReq.bidUnits.push(bidUnit)
      let adUnit = {}
      let mt = ''
      for (let key in bid.mediaTypes) {
        mt = key
        adUnit = {
          id: bid.adUnitCode,
          sizes: []
        }
        for (let i = 0; i < bid.mediaTypes[key].sizes.length; i++) {
          let size = {}
          size.w = bid.mediaTypes[key].sizes[i][0]
          size.h = bid.mediaTypes[key].sizes[i][1]
          let sizeStr = `${size.w}x${size.h}`
          if (this.auction.adUnitIdMapper.includes(sizeStr)) {
            size.id = this.auction.adUnitIdMapper.indexOf(sizeStr)
          } else {
            this.auction.adUnitIdMapper.push(sizeStr)
            size.id = this.auction.adUnitIdMapper.indexOf(sizeStr)
          }
          size.mt = mt
          adUnit.sizes.push(size)
        }
        this.auction.adUnits.push(adUnit)
      }
    });
    this.auction.bidRequests.push(bidReq);
  }

  bidResponse(args) {

  }

  bidWon(args) {

  }

  bidTimeout(args) {

  }

  send() {
    console.log(`this.auction: ${JSON.stringify(this.auction, null, 1)}`)
  }
}

class LogError {
  /**
   * Creates a new instance for error messages
   * @param {*} e - error event object
   * @param {*} data - auction specific data
   */
  constructor(e, data) {
    this.error = {}
    this.error.payload = 'error'
    this.error.message = e.message
    this.error.stack = e.stack
    this.error.data = data
    this.error.prebidVersion = pbVersion
    this.error.url = utils.getTopWindowLocation().href
    this.error.userAgent = navigator.userAgent
  }
  send() {
    console.log(`LogError error message: ${JSON.stringify(this.error, null, 1)}`)
  }
}

// utility function for debugging
underdogmediaAnalyticsAdapter.getAuctions = () => {
  return currentAuctions;
};

// // save the base class function
underdogmediaAnalyticsAdapter.originEnableAnalytics = underdogmediaAnalyticsAdapter.enableAnalytics;

// // override enableAnalytics so we can get access to the config passed in from the page
underdogmediaAnalyticsAdapter.enableAnalytics = function (config) {
  underdogmediaAnalyticsAdapter.initOptions = config.options;

  let prebidSiteId = ''
  let prebidSiteName = ''

  if (!config.options.pubId) {
    utils.logError('Publisher ID (pubId) option is not defined. Analytics won\'t work');
    return;
  }
  if (config && config.options && config.options.prebidSiteId) {
    prebidSiteId = config.options.prebidSiteId
  }
  if (config && config.options && config.options.prebidSiteName) {
    prebidSiteName = config.options.prebidSiteName
  }

  underdogmediaAnalyticsAdapter.prebidSiteId = prebidSiteId
  underdogmediaAnalyticsAdapter.prebidSiteName = prebidSiteName
  underdogmediaAnalyticsAdapter.originEnableAnalytics(config); // call the base class function
}

adapterManager.registerAnalyticsAdapter({
  adapter: underdogmediaAnalyticsAdapter,
  code: 'underdogmedia'
});

export default underdogmediaAnalyticsAdapter;
