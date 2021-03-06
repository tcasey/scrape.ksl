const Horseman  = require('node-horseman'),
    pdfconcat   = require('pdfconcat'),
    co          = require('co'),
    tmp         = require('tmp'),
    fs          = require('fs'),
    config      = require('./configs/config.json');


var scrape = {
    ksl: function(callback) {
    console.log('Starting ksl report');

    var user_input  = 'Front',
        report      =  'job_listings',
        pdfName     =  [],
        concatIt    =  [];

    //  horseman options can be added & set within this object
    var horseman = new Horseman({timeout: 60000});
    horseman.userAgent('"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2790.0 Safari/537.36"')

    co(function*() {

      // Useful functions
      yield horseman.on('urlChanged', function(targetUrl) {
          console.log('URL CHANGED IN APP: ', targetUrl);
      });

      // Navigation
      yield horseman.viewport(1000, 980);
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
        //   console.log('Rendered page ' + i + '');
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
                        link: '',
                        location: '',
                        company: '',
                        time: ''
                    };

                    // grabbing data for each keyword match
                    $.each($('.yoda'+i+' h2'), function (i, value) {
                        listing_data_obj.title = $(value).text();
                    });
                    $.each($('.yoda'+i+' h2 a'), function (i, value) {
                        var address = $(value).attr('href');
                        listing_data_obj.link = 'www.ksl.com' + address;
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
        };

        // clean up DOM
        yield horseman.evaluate(function() {
            $('.display-ad-link-container').remove();
            $('.search-results-sort-bar').remove();
            $('.search-results-header').remove();
            $('.ksl-header__outer').remove();
            $('#google_image_div').remove();
            $('.fraud-warning').remove();
            $('.IntAd_img').remove();
            $('#keyword').remove();
            $('.facets').remove();
            $('#IntAd').remove();
            $('img').remove();
        });

        yield horseman.wait(200);

        // pdf capture
            var tmpobjPDF = tmp.dirSync();
            pdfName.unshift(report + i + '.pdf');
            var tmpppdf = tmpobjPDF.name + pdfName[0];
            concatIt.push(tmpppdf);
            yield horseman.pdf(tmpppdf, {
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

      // combining pdf files into a single page
      yield horseman.do(function(done) {
          var namelyOrdered = pdfName.reverse();
          function fileNamesToConcat(element) {
              concatIt
          }
          namelyOrdered.forEach(fileNamesToConcat);
          pdfconcat(concatIt, config.jobFolder + report + '.pdf', function(err) {
              err ? console.log(err) : console.log('A NEW single Multi-paged PDF has been born');
          });
          setTimeout(done, 100);
      });

      console.log('data_loot', data_loot);
      // destroying temporary files
      yield horseman.do(function(done) {
        tmpobjPDF.removeCallback();
        tmp.setGracefulCleanup();
        setTimeout(done, 100);
        console.log('setGracefulCleanup ran');
      });
      yield horseman.close();
    }).then(function(value) {
        console.log('DOING THEN');
        callback(null, data_loot);
    }, function(err) {
        console.log('GOT CO ERROR', err);
        horseman.close();
        callback(err);
    });

    }

};


module.exports = scrape;
