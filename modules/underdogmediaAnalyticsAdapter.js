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
let completeObject = {
  publisher_id: null,
  auction_id: null,
  referer: null,
  screen_resolution: window.screen.width + 'x' + window.screen.height,
  device_type: null,
  geo: null,
  events: []
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
          setTimeout(function () { sendEvent(completeObject) }, 3100);
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
  console.log(`auction init, args: ${JSON.stringify(args, null, 1)}`)
  completeObject.auction_id = args.auctionId;
  completeObject.publisher_id = underdogmediaAnalyticsAdapter.initOptions.pubId;
  try { completeObject.referer = args.bidderRequests[0].refererInfo.referer.split('?')[0]; } catch (e) { console.log(e.message); }
  completeObject.device_type = deviceType();
}
function bidRequested(args) {
  console.log(`bidRequested, args: ${JSON.stringify(args, null, 1)}`)
  let tmpObject = {
    type: 'REQUEST',
    bidder_code: args.bidderCode,
    event_timestamp: args.start,
    bid_gpt_codes: {}
  };

  args.bids.forEach(bid => {
    tmpObject.bid_gpt_codes[bid.adUnitCode] = bid.sizes;
  });

  completeObject.events.push(tmpObject);
}

function bidResponse(args) {
  console.log(`bidResponse, args: ${JSON.stringify(args, null, 1)}`)
  let tmpObject = {
    type: 'RESPONSE',
    bidder_code: args.bidderCode,
    event_timestamp: args.responseTimestamp,
    size: args.size,
    gpt_code: args.adUnitCode,
    currency: args.currency,
    creative_id: args.creativeId,
    time_to_respond: args.timeToRespond,
    cpm: args.cpm,
    is_winning: false
  };

  bidResponsesMapper[args.requestId] = completeObject.events.push(tmpObject) - 1;
}

function bidWon(args) {
  console.log(`bidWon, args: ${JSON.stringify(args, null, 1)}`)
  let eventIndex = bidResponsesMapper[args.requestId];
  completeObject.events[eventIndex].is_winning = true;
}

function bidTimeout(args) { /* TODO: implement timeout */ }

// Methods
function deviceType() {
  if ((/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(navigator.userAgent.toLowerCase()))) {
    return 'tablet';
  }
  if ((/iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(navigator.userAgent.toLowerCase()))) {
    return 'mobile';
  }
  return 'desktop';
}

function sendEvent(completeObject) {
  try {
    console.log(`sendEvent, completeObject: ${JSON.stringify(completeObject, null, 1)}`)
    // let responseEvents = btoa(JSON.stringify(completeObject)); // encodes completeObject in base-64
    // let mutation = `mutation {createEvent(input: {event: {eventData: "${responseEvents}"}}) {event {createTime } } }`;
    // let dataToSend = JSON.stringify({ query: mutation });
    // ajax(url, function () { console.log(Date.now() + ' Sending event to Underdog Media server.') }, dataToSend, {
    //   contentType: 'application/json',
    //   method: 'POST'
    // });
  } catch (err) { console.log(err) }
}
