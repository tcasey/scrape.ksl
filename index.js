const Horseman = require('node-horseman'),
    pdfcon   = require('pdfconcat'),
    co       = require('co'),
    tmp      = require('tmp'),
    fs       = require('fs'),
    config   = require('./configs/config.json'),
    job_title = [],
    user_input = 'Front';

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

  // calculations
  const totalListing = yield horseman.text('.total-listings');
  const numListing = yield horseman.count('.listing');
  const pagination = (Math.ceil(totalListing/numListing));
  console.log('Total number of Listings: ', totalListing);
  console.log('Number of Listings on page: ', numListing);
  console.log('There are ' + pagination + ' total pages');

 var injectable_function = function addElement () {
    var newDiv = document.createElement('div');
        newDiv.setAttribute('id', 'keyword');
    var newContent = document.createTextNode(user_input);
        newDiv.appendChild(newContent);//add the text node to the newly created div.
    var currentDiv = document.getElementById('div1');
    document.body.insertBefore(newDiv, currentDiv);
};

  var keyword = ("var user_input = '"+user_input +"';"+ injectable_function + 'addElement();');
  var tmpobj = tmp.fileSync({
      mode: 0644,
      prefix: 'tmp-',
      postfix: '.js'
  });
  fs.writeFile(tmpobj.name, keyword, function(err) {
    if (err) {
      return console.log(err);
    }
    console.log("The file was saved!");
  });

  yield horseman.wait(1000);

  for (var i = 1; pagination >= i; i++) {
    console.log('Rendered page ' + i + '');
    yield horseman.injectJs(tmpobj.name);
    yield horseman.waitForSelector('#keyword');
    yield horseman.evaluate(function() {
        var keyword_match = $('#keyword').text();
        $('.search-results .job-title').each(function() {
            if($(this).text().match(keyword_match)) {
                $(this).addClass('yoda');
            }
        });
    });

    yield horseman.wait(2000);
    var title = yield horseman.evaluate(function() {
      var titles = [];
      $.each($('.yoda'), function (i, value) {
        titles.push($(value).text())
      });
      return {
        goods: titles
      }
    });

    job_title.push(title.goods);
    var merged = JSON.stringify([].concat.apply([], job_title));
    console.log('Goods ', merged);

    yield horseman.evaluate(function() {
      $('.ksl-header__outer').remove();
      $('.facets').remove();
      $('.fraud-warning').remove();
    });

    yield horseman.pdf(config.jobFolder + 'jobs' + i + '.pdf', {
      format: 'A2',
      orientation: 'portrait',
      margin: '0.2in'
    });

    yield horseman.wait(3000);
    yield horseman.click('.next');
    yield horseman.waitForNextPage();
    // yield horseman.waitForSelector('.listing');
  };

  yield horseman.do(function(done) {
    tmp.setGracefulCleanup();
    setTimeout(done, 100);
    console.log('setGracefulCleanup ran');
  });
  yield horseman.close();
}).catch(function(e){
  console.log(e)
});
