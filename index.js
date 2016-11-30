const Horseman = require('node-horseman'),
    pdfcon   = require('pdfconcat'),
    co       = require('co'),
    tmp      = require('tmp'),
    fs       = require('fs'),
    config   = require('./configs/config.json'),
    user_input = 'Front';

//  horseman options can be added & set within this object
var horseman = new Horseman({timeout: 60000});
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

  // calculations
  const totalListing = yield horseman.text('.total-listings');
  const numListing = yield horseman.count('.listing');
  const pagination = (Math.ceil(totalListing/numListing));
  console.log('Total number of Listings: ', totalListing);
  console.log('Number of Listings on page: ', numListing);
  console.log('There are ' + pagination + ' total pages');

  // temporary file used for keyword match
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
  var data_loot = [];
  for (var i = 1; pagination >= i; i++) {
    console.log('Rendered page ' + i + '');
    yield horseman.injectJs(tmpobj.name);
    yield horseman.waitForSelector('#keyword');

    // setting indicator class to keyword match
    var payload = yield horseman.evaluate(function() {
        var listing_data = [];
        var keyword_match = $('#keyword').text();
        $('.search-results .listing').each(function(i) {

            // keyword match check
            if($(this).text().match(keyword_match)) {
                $(this).addClass('yoda'+i);

                // JSON structure
                var listing_data_obj = {
                    title: '',
                    location: '',
                    // company: ''
                    time: ''
                };

                // grabbing data for each keyword match
                $.each($('.yoda'+i+' h2'), function (i, value) {
                  listing_data_obj.title = $(value).text();
                });
                $.each($('.yoda'+i+' .location'), function (i, value) {
                  listing_data_obj.location = $(value).text();
                });
                // $.each($('.yoda'+i+' .company-name'), function (i, value) {
                //   listing_data_obj.company = $(value).text();
                // });
                $.each($('.yoda'+i+' .posted-time'), function (i, value) {
                  listing_data_obj.time = $(value).text();
                });
                listing_data.push(listing_data_obj);
            }
        });
        return {
          data: listing_data
        }
    });

    // combine keyword matched data
    if(payload.data[0]) {
        data_loot.push(payload.data[0]);
        console.log('payload', payload.data[0]);
        console.log('data_loot', data_loot);
    };

    yield horseman.wait(200);

    // pdf capture
    yield horseman.pdf(config.jobFolder + 'jobs' + i + '.pdf', {
      format: 'A2',
      orientation: 'portrait',
      margin: '0.2in'
    });

    // only clicking next if not the last page
    if(pagination !== i) {
        yield horseman.wait(1000);
        yield horseman.click('.next');
        yield horseman.wait(2000);
        yield horseman.waitForNextPage();
    }
  };

  // destroying temporary file used for keyword match
  yield horseman.do(function(done) {
    tmp.setGracefulCleanup();
    setTimeout(done, 100);
    console.log('setGracefulCleanup ran');
  });
  yield horseman.close();
}).catch(function(e){
  console.log(e)
});
