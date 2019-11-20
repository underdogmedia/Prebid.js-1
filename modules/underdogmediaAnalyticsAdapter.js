import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';
import CONSTANTS from '../src/constants.json';
let pbVersion = require('../package.json').version
// import { ajax } from '../src/ajax';

// const url = 'underdog_media_url';

// Events needed
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

let payload = {
  reqType: 'Prebid',
  adUnits: [],
  bidRequests: [],
  udmInternal: {
    sid: '?',
    prodType: 'R3',
    clientVers: pbVersion
  }
};

let underdogmediaAnalyticsAdapter = Object.assign(adapter({analyticsType: 'endpoint'}),
  {
    track({ eventType, args }) {
      switch (eventType) {
        case AUCTION_INIT:
          auctionInit(args);
          break;
        case BID_REQUESTED:
          bidRequested(args);
          break;
        case BID_RESPONSE:
          bidResponse(args);
          break;
        case BID_WON:
          bidWon(args);
          break;
        case BID_TIMEOUT:
          bidTimeout(args);
          break;
        case AUCTION_END:
          setTimeout(function () { sendEvent(payload) }, 3100);
          break;
        default:
          break;
      }
    }
  });

// *** EVENT HANDLERS *** //

function auctionInit(args) {}

function bidRequested(args) {
  // Initial formatting for payload.bidRequests
  let bidReq = {
    bidder: args.bidderCode,
    bidType: 'Prebid',
    bidRecvCnt: 0,
    bidUnits: []
  };

  // Formatting payload.adUnits
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
        size.h = bid.mediaTypes[key].sizes[i][0]
        size.w = bid.mediaTypes[key].sizes[i][1]
        size.mt = mt
        adUnit.sizes.push(size)
      }
      payload.adUnits.push(adUnit)
    }
  });
  payload.bidRequests.push(bidReq);
}

function bidResponse(args) {
  for (let i = 0; i < payload.bidRequests.length; i++) {
    if (args.bidderCode === payload.bidRequests[i].bidder) {
      payload.bidRequests[i].bidRecvCnt++
      payload.bidRequests[i].took = args.timeToRespond

      for (let j = 0; j < payload.bidRequests[i].bidUnits.length; j++) {
        if (args.adUnitCode === payload.bidRequests[i].bidUnits[j].adUnitId) {
          payload.bidRequests[i].bidUnits[j].sizes[0].cpm = args.cpm
          payload.bidRequests[i].bidUnits[j].sizes[0].requestId = args.requestId
        }
      }
    }
  }
}

function bidWon(args) {
  for (let i = 0; i < payload.bidRequests.length; i++) {
    if (args.bidderCode === payload.bidRequests[i].bidder && args.requestId === payload.bidRequests[i].bidUnits[0].sizes[0].requestId) {
      payload.bidRequests[i].bidUnits[0].sizes[0].won = true
      delete payload.bidRequests[i].bidUnits[0].sizes[0].requestId
    } else {
      delete payload.bidRequests[i].bidUnits[0].sizes[0].cpm
      delete payload.bidRequests[i].bidUnits[0].sizes[0].requestId
    }
  }
}

function bidTimeout(args) {}

function sendEvent(payload) {
  try {
    console.log(`sendEvent, payload: ${JSON.stringify(payload, null, 1)}`)
  } catch (err) {
    console.log(err)
  }
}

// DEVICE TYPE

// function deviceType() {
//   if ((/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(navigator.userAgent.toLowerCase()))) {
//     return 'tablet';
//   }
//   if ((/iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(navigator.userAgent.toLowerCase()))) {
//     return 'mobile';
//   }
//   return 'desktop';
// }

// DFP SUPPORT

// let googletag = window.googletag || {};
// googletag.cmd = googletag.cmd || [];
// googletag.cmd.push(function() {
//   googletag.pubads().addEventListener('slotRenderEnded', args => {
//     console.log(Date.now() + ' GOOGLE SLOT: ' + JSON.stringify(args));
//   });
// });

// // save the base class function
underdogmediaAnalyticsAdapter.originEnableAnalytics = underdogmediaAnalyticsAdapter.enableAnalytics;

// // override enableAnalytics so we can get access to the config passed in from the page
underdogmediaAnalyticsAdapter.enableAnalytics = function (config) {
  underdogmediaAnalyticsAdapter.initOptions = config.options;

  if (!config.options.pubId) {
    utils.logError('Publisher ID (pubId) option is not defined. Analytics won\'t work');
    return;
  }

  underdogmediaAnalyticsAdapter.originEnableAnalytics(config); // call the base class function
}

adapterManager.registerAnalyticsAdapter({
  adapter: underdogmediaAnalyticsAdapter,
  code: 'underdogmedia'
});

export default underdogmediaAnalyticsAdapter;
