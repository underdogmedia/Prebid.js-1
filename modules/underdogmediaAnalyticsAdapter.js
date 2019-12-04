import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';
import CONSTANTS from '../src/constants.json';
import * as utils from '../src/utils';
let pbVersion = require('../package.json').version;
// import { ajax } from '../src/ajax';

// const url = 'underdog_media_url';

// Prebid events needed
const {
  EVENTS: {
    AUCTION_INIT,
    BID_REQUESTED,
    BID_TIMEOUT,
    BID_RESPONSE,
    NO_BID,
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
        if (args && args.auctionId && currentAuctions[args.auctionId] && currentAuctions[args.auctionId].status === 'complete') {
          throw new Error('Event Received after Auction Close. Auction Id: ' + args.auctionId)
        }
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
          case NO_BID:
            currentAuctions[args.auctionId].noBid(args)
            break;
          case BID_WON:
            currentAuctions[args.auctionId].bidWon(args)
            break;
          case BID_TIMEOUT:
            currentAuctions[args.auctionId].bidTimeout(args)
            break;
          case AUCTION_END:
            currentAuctions[args.auctionId].auctionEnd(args)
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
    this.auction.refUrl = utils.getTopWindowLocation().href
    this.auction.adUnits = []
    this.auction.bidRequests = []
    this.auction.adUnitIdMapper = []
    this.auction.udmInternal = {
      prodType: 'Prebid',
      clientVers: pbVersion
    }
    this.auction.start = ''
    this.auction.end = ''
    this.auction.device = this.deviceType()
    setTimeout(function(id) {
      console.log(`deleting auction ${id}`)
      delete currentAuctions[id]
    }, 300000, this.auction.auctionId)
  }

  auctionInit(args) {
    this.auction.start = args.timestamp
  }

  /**
   * Record a bid request event
   * @param {*} args - the args object from the auction event
   */
  bidRequested(args) {
    let bidReq = {
      bidder: args.bidderCode,
      bidType: 'Prebid',
      bidRecvCnt: 0,
      bidUnits: [],
      start: args.start,
      timedOut: null
    }
    args.bids.forEach(bid => {
      let adUnit = {}
      let bidUnit = {}
      let mt = ''

      for (let key in bid.mediaTypes) {
        mt = key
        adUnit = {
          id: bid.adUnitCode,
          sizes: []
        }
        bidUnit = {
          adUnitId: bid.adUnitCode,
          sizes: []
        }
        for (let i = 0; i < bid.mediaTypes[key].sizes.length; i++) {
          let adUnitSize = {}
          let bidUnitSize = {}
          adUnitSize.w = bid.mediaTypes[key].sizes[i][0]
          adUnitSize.h = bid.mediaTypes[key].sizes[i][1]
          let sizeStr = `${adUnitSize.w}x${adUnitSize.h}`
          if (this.auction.adUnitIdMapper.includes(sizeStr)) {
            adUnitSize.id = this.auction.adUnitIdMapper.indexOf(sizeStr)
            bidUnitSize.id = this.auction.adUnitIdMapper.indexOf(sizeStr)
          } else {
            this.auction.adUnitIdMapper.push(sizeStr)
            adUnitSize.id = this.auction.adUnitIdMapper.indexOf(sizeStr)
            bidUnitSize.id = this.auction.adUnitIdMapper.indexOf(sizeStr)
          }
          adUnitSize.mt = mt
          adUnit.sizes.push(adUnitSize)
          bidUnit.sizes.push(bidUnitSize)
        }
        this.auction.adUnits.push(adUnit)
        bidReq.bidUnits.push(bidUnit)
      }
    });
    this.auction.bidRequests.push(bidReq);
  }

  /**
   * Record a bid response event
   * @param {*} args - the args object from the auction event
   */
  bidResponse(args) {
    for (let i = 0; i < this.auction.bidRequests.length; i++) {
      if (args.bidderCode === this.auction.bidRequests[i].bidder) {
        this.auction.bidRequests[i].bidRecvCnt++
        this.auction.bidRequests[i].took = args.timeToRespond
        for (let j = 0; j < this.auction.bidRequests[i].bidUnits.length; j++) {
          if (args.adUnitCode === this.auction.bidRequests[i].bidUnits[j].adUnitId) {
            for (let k = 0; k < this.auction.bidRequests[i].bidUnits[j].sizes.length; k++) {
              let currBidId = this.auction.bidRequests[i].bidUnits[j].sizes[k].id
              let resBidId = this.auction.adUnitIdMapper.indexOf(`${args.width}x${args.height}`)
              if (currBidId === resBidId) {
                this.auction.bidRequests[i].bidUnits[j].sizes[k].cpm = args.cpm
              }
            }
          }
        }
      }
    }
  }

  noBid(args) {
    for (let i = 0; i < this.auction.bidRequests.length; i++) {
      if (args.bidder === this.auction.bidRequests[i].bidder) {
        this.auction.bidRequests[i].took = 'noResponse'
      }
    }
  }

  /**
   * Record a bid won event
   * @param {*} args - the args object from the auction event
   */
  bidWon(args) {
    for (let i = 0; i < this.auction.bidRequests.length; i++) {
      if (args.bidderCode === this.auction.bidRequests[i].bidder) {
        for (let j = 0; j < this.auction.bidRequests[i].bidUnits.length; j++) {
          if (args.adUnitCode === this.auction.bidRequests[i].bidUnits[j].adUnitId) {
            for (let k = 0; k < this.auction.bidRequests[i].bidUnits[j].sizes.length; k++) {
              let currBidId = this.auction.bidRequests[i].bidUnits[j].sizes[k].id
              let resBidId = this.auction.adUnitIdMapper.indexOf(`${args.width}x${args.height}`)
              if (currBidId === resBidId) {
                this.auction.bidRequests[i].bidUnits[j].sizes[k].won = true
              }
            }
          }
        }
      }
    }
  }

  bidTimeout(args) {
    for (let i = 0; i < this.auction.bidRequests.length; i++) {
      if (args.bidder === this.auction.bidRequests[i].bidder) {
        this.auction.bidRequests[i].timedOut = true
      }
    }
  }

  auctionEnd(args) {
    this.auction.end = args.auctionEnd
    let auctionTime = this.auction.end - this.auction.start
    for (let i = 0; i < this.auction.bidRequests.length; i++) {
      if (this.auction.bidRequests[i].took === 'noResponse') {
        this.auction.bidRequests[i].took = auctionTime
      }
    }
    currentAuctions[this.auction.auctionId] = {status: 'complete', auctionId: this.auction.auctionId}
    delete this.auction.adUnitIdMapper
    delete this.auction.auctionId
    delete this.auction.start
    delete this.auction.end
    console.log(`this.auction: ${JSON.stringify(this.auction, null, 1)}`)
  }

  deviceType() {
    if ((/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(navigator.userAgent.toLowerCase()))) {
      return 'tablet';
    }
    if ((/iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(navigator.userAgent.toLowerCase()))) {
      return 'mobile';
    }
    return 'desktop';
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

// utility function for testing
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
