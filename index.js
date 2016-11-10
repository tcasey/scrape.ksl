const Horseman = require('node-horseman'),
    pdfcon   = require('pdfconcat'),
    co       = require('co'),
    config   = require('./configs/config.json');

//  horseman options can be added & set within this object
var horseman = new Horseman({timeout: 10000});
horseman.userAgent('"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2790.0 Safari/537.36"')

co(function*() {

// Useful functions

  yield horseman.on('urlChanged', function(targetUrl) {
    console.log('URL CHANGED IN APP: ', targetUrl);
  });

// Navigation
  yield horseman.viewport(1280, 980);
  yield horseman.open(config.baseURL);
  yield horseman.waitForSelector('.listing');

  yield horseman.evaluate(function() {
    $('.ksl-header__outer').remove();
    $('.facets').remove();
    $('.fraud-warning').remove();
  });

  yield horseman.pdf('jobs.pdf', {
           format: 'A2',
           orientation: 'portrait',
           margin: '0.2in'
         });

  // calculations
  const totalListing = yield horseman.text('.total-listings');
  const numListing = yield horseman.count('.listing');
  const pagination = (Math.ceil(totalListing/numListing));
  console.log('Total number of Listings: ', totalListing);
  console.log('Number of Listings on page: ', numListing);
  console.log('There are ' + pagination + ' total pages');

  for (var i = 1; pagination >= i; i++) {
    console.log('Rendered page ' + i + '');

    // TODO: use exist method to check before using evaluate so the app won't crash


    var title = yield horseman.evaluate(function() {
      var titles = [];
      $.each($('.job-title'), function (i, value) {
        titles.push($(value).text())
      });

      return {
        goods: titles
      }
    });

    console.log('Goods ', title.goods);

    yield horseman.evaluate(function() {
      $('.ksl-header__outer').remove();
      $('.facets').remove();
      $('.fraud-warning').remove();
    });

    yield horseman.pdf('jobs' + i + '.pdf', {
      format: 'A2',
      orientation: 'portrait',
      margin: '0.2in'
    });

    yield horseman.wait(3000);
    yield horseman.click('.next');
    yield horseman.waitForSelector('.listing');
  };

  yield horseman.close();
}).catch(function(e){
  console.log(e)
});
