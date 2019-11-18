// import { ajax } from '../src/ajax';
import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';
import CONSTANTS from '../src/constants.json';
// import * as utils from '../src/utils';

// const analyticsType = 'endpoint';
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

// Prebid events we could utilize...

// BID_ADJUSTMENT
// NO_BID
// BIDDER_DONE
// SET_TARGETING
// REQUEST_BIDS
// ADD_AD_UNITS
// AD_RENDER_FAILED

// Memory objects
let payload = {
  reqType: 'Prebid',
  adUnitCode: [],
  bidRequests: [],
  bidResponses: [],
  udmInternal: {}
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

// DFP support

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

// *** EVENT HANDLERS *** //

let bidResponsesMapper = {};

function auctionInit(args) {
  // console.log(`auction init, args: ${JSON.stringify(args, null, 1)}`)
}

function bidRequested(args) {
  // console.log(`bidRequested, args: ${JSON.stringify(args, null, 1)}`)
  let bidReq = {
    bidder: args.bidderCode,
    bidType: 'Prebid',
    bidRecvCnt: 0,
    bidUnits: []
  };

  console.log(args.bids.length)

  args.bids.forEach(bid => {
    console.log(`bid: ${JSON.stringify(bid, null, 1)}`)
    let adUnit = {}
    let mt = ''
    for (let key in bid.mediaTypes) {
      mt = key
      adUnit = { sizes: [] }
      adUnit.id = bid.adUnitCode
      for (let i = 0; i < bid.mediaTypes[key].sizes.length; i++) {
        let size = {}
        size.h = bid.mediaTypes[key].sizes[i][0]
        size.w = bid.mediaTypes[key].sizes[i][1]
        size.mt = mt
        adUnit.sizes.push(size)
      }
      payload.adUnitCode.push(adUnit)
    }
  });
  payload.bidRequests.push(bidReq);
}

function bidResponse(args) {
  // console.log(`bidResponse, args: ${JSON.stringify(args, null, 1)}`)
  let bidRes = {
    bidder: args.bidderCode,
    event_timestamp: args.responseTimestamp,
    size: args.size,
    gpt_code: args.adUnitCode,
    currency: args.currency,
    creative_id: args.creativeId,
    time_to_respond: args.timeToRespond,
    cpm: args.cpm,
    is_winning: false
  };

  bidResponsesMapper[args.requestId] = payload.bidResponses.push(bidRes) - 1;
}

function bidWon(args) {
  console.log(`bidWon, args: ${JSON.stringify(args, null, 1)}`)
  // let eventIndex = bidResponsesMapper[args.requestId];
  // payload.events[eventIndex].is_winning = true;
}

function bidTimeout(args) {
  console.log('bidTimeout event')
}

// Methods
// function deviceType() {
//   if ((/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(navigator.userAgent.toLowerCase()))) {
//     return 'tablet';
//   }
//   if ((/iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(navigator.userAgent.toLowerCase()))) {
//     return 'mobile';
//   }
//   return 'desktop';
// }

function sendEvent(payload) {
  try {
    // console.log(`prebidGlobal: ${JSON.stringify($$PREBID_GLOBAL$$, null, 1)}`)
    console.log(`sendEvent, payload: ${JSON.stringify(payload, null, 1)}`)
    // let responseEvents = btoa(JSON.stringify(payload)); // encodes payload in base-64
    // let mutation = `mutation {createEvent(input: {event: {eventData: "${responseEvents}"}}) {event {createTime } } }`;
    // let dataToSend = JSON.stringify({ query: mutation });
    // ajax(url, function () { console.log(Date.now() + ' Sending event to Underdog Media server.') }, dataToSend, {
    //   contentType: 'application/json',
    //   method: 'POST'
    // });
  } catch (err) { console.log(err) }
}
