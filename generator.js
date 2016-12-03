var
    config      = require('./configs/config.json'),
    nodemailer  = require('nodemailer'),
    async       = require('async'),
    fs          = require('fs');

    var generator = {
        generate: function (callback) {
            var reportData;
            var     namely      = [],
                    data_loot   = [],
                    msg         = 'Your day is about to get a lot better',
                    from_label  = '🎉 Happy Job Hunting 💻',
                    list        = ['tcasey@convirza.com', 'hello@tcasey.me'];

            async.waterfall([
                function(cb) {
                    scrape.ksl(function (err) {
                        if (err) { return cb('Failed running report process. '+err); }
                            cb(null);
                        });
                },
                function(cb) {
                    // send e-mail message
                    var emailData = {
                        msg: msg,
                        to: list.shift(),
                        from_label: from_label,
                        bcc: list
                    };

                    mail.sendIt(emailData, function(err) {
                        if (err) { return cb(err); }
                        cb(null);
                    });
                }
            ],
            function (err) {
                if (err) { return callback('Failed to complete report. '+err); }
                callback(null);
            });
        }
    };

    module.exports = generator;
