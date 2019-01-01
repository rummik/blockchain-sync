const got = require('got');
const { CookieJar } = require('tough-cookie');
const FileCookieStore = require('file-cookie-store');
const FormData = require('form-data');
const cheerio = require('cheerio');
const inquirer = require('inquirer');
const util = require('util');

const lists = require('./lists.json');

let cookieJar = new CookieJar(new FileCookieStore('./cookie.txt', { lockfile: true }));
let { instance, ...auth } = require('./auth.json');

let URLs = {
  login: `${instance}/auth/sign_in`,
  blocks: `${instance}/admin/domain_blocks`,
};

let domains = {};

(async () => {
  console.log('Building block list...');
  // Build domain block list
  {
    let includes = await Promise.all(lists.includes.map(url => got(url).then(res => JSON.parse(res.body))));
    let blocks = includes.reduce((a, b) => a.concat(b.block), lists.blocklist || []);
    let actions = {};

    lists.actions.forEach(({ reasons, severity, reject = [] }) => {
      reasons.forEach(reason => {
        actions[reason] = {
          severity,
          reject: severity === 'suspend' ? [ 'media', 'reports' ] : reject.sort(),
      }
      });
    });

    blocks.filter(({ domain }) => !!domain).forEach(({ domain, reasons }) => {
      domains[domain] = reasons.map(reason => actions[reason.toLowerCase()]).reduce(
        (a, b) => (a.severity === 'suspend' || a.reject.length > b.reject.length) ? a : b,
      );
    });
  }

  console.log('Getting login state...');
  // Handle login (if necessary)
  {
    let $, response;
    let loginForm = new FormData();
    let otpForm = new FormData();

    response = await got(instance, { cookieJar });
    $ = cheerio.load(response.body);

    if (/Log in/.test(response.body)) {
      loginForm.append('user[email]', auth.email);
      loginForm.append('user[password]', auth.password);
      loginForm.append('authenticity_token', $('[name=authenticity_token]').val());

      response = await got.post(URLs.login, { cookieJar, body: loginForm }).catch(res => res);
      $ = cheerio.load(response.body);

      if ($('[name="user[otp_attempt]"]').length) {
        let { token } = await inquirer.prompt([
          { type: 'input', name: 'token', message: '2FA token?' },
        ]);

        otpForm.append('user[otp_attempt]', token);
        otpForm.append('authenticity_token', $('[name=authenticity_token]').val());

        response = await got.post(URLs.login, { cookieJar, body: otpForm }).catch(res => res);
      }

      if (response.statusCode !== 302) {
        process.exit();
      } else {
        console.log('Logged in!');
      }
    }
  }

  console.log('Syncing...');

  // Sync block list
  {
    let $, response;
    let updates = {};
    let page = 1;

    do {
      response = await got(`${URLs.blocks}?page=${page}`, { cookieJar });
      $ = cheerio.load(response.body);

      $('table tbody tr').each((i, row) => {
        let $row = $(row);
        let domain = $row.find('samp').text();
        let id = $row.find('a').attr('href').match(/\d+/)[0];

        let data = {
          severity: $row.find('[class=severity]').text().trim().toLowerCase(),
          reject: [].concat(
            $row.find('[class=reject_media] i').length ? [ 'media' ] : [],
            $row.find('[class=reject_reports] i').length ? [ 'reports' ] : [],
          ),
        };

        if (domains[domain] && !util.isDeepStrictEqual(data, domains[domain])) {
          updates[domain] = id;
        } else {
          delete domains[domain];
        }
      });
    } while (page = $('.pagination .page a[rel="next"]').text());

    for (let domain in domains) {
      let data = domains[domain];
      let addForm = new FormData();

      response = await got(`${URLs.blocks}/new`, { cookieJar });
      $ = cheerio.load(response.body);

      addForm.append('authenticity_token', $('[name=authenticity_token]').val());
      addForm.append('domain_block[domain]', domain);
      addForm.append('domain_block[severity]', data.severity);
      addForm.append('domain_block[reject_media]', data.reject.indexOf('media') === -1 ? 0 : 1);
      addForm.append('domain_block[reject_reports]', data.reject.indexOf('reports') === -1 ? 0 : 1);


      // remove domain if it's going to be updated
      if (updates[domain] !== undefined) {
        response = await got(`${URLs.blocks}/${updates[domain]}`, { cookieJar });
        $ = cheerio.load(response.body);

        let deleteForm = new FormData();
        deleteForm.append('_method', 'delete');
        deleteForm.append('domain_block[retroactive]', '0');
        deleteForm.append('authenticity_token', $('[name=authenticity_token]').val());

        console.log('removing', domain);
        response = await got.post(`${URLs.blocks}/${updates[domain]}`, { cookieJar, body: deleteForm }).catch(res => res);
      }

      console.log('adding', domain);
      response = await got.post(`${URLs.blocks}`, { cookieJar, body: addForm }).catch(res => res);
    }
  }
})();
