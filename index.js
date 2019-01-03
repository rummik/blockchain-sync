const got = require('got');
const { CookieJar } = require('tough-cookie');
const FileCookieStore = require('file-cookie-store');
const FormData = require('form-data');
const cheerio = require('cheerio');
const inquirer = require('inquirer');
const util = require('util');

const config = require('./lists.json');

let cookieJar = new CookieJar(new FileCookieStore('./cookie.txt', { lockfile: true }));
let { instance, ...auth } = require('./auth.json');

let URLs = {
  login: `${instance}/auth/sign_in`,
  blocks: `${instance}/admin/domain_blocks`,
};

let blocklist = {};
let allowlist = {};

(async () => {
  console.log('Building block list...');
  // Build domain block list
  {
    let includes = await Promise.all(config.includes.map(url => got(url).then(res => JSON.parse(res.body))));
    let blocks = includes.reduce((a, b) => a.concat(b.block || b.blocklist), []).concat(config.blocklist);
    let allows = config.allowlist || [];
    let filters = {};

    // Create filters map
    config.filters.forEach(({ reasons, severity, reject = [] }) => {
      reasons.forEach(reason => {
        filters[reason] = {
          severity,
          reject: severity === 'suspend' ? [ 'media', 'reports' ] : reject.sort(),
        };
      });
    });

    // Build finalized block list
    blocks.filter(({ domain }) => !!domain).forEach(({ domain, reasons }) => {
      // Filters with the most severe action should take precedence
      blocklist[domain] = reasons.map(reason => filters[reason.toLowerCase()]).reduce(
        (a, b) => (a.severity === 'suspend' || a.reject.length > b.reject.length) ? a : b,
      );
    });

    // Build allowlist
    allows.filter(({ domain }) => !!domain).forEach(({ domain }) => {
      allowlist[domain] = true;
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
    let current = {};
    let page = 1;

    // Pull in instance's current block list, handling pagination
    do {
      response = await got(`${URLs.blocks}?page=${page}`, { cookieJar });
      $ = cheerio.load(response.body);

      $('table tbody tr').each((i, row) => {
        let $row = $(row);
        let domain = $row.find('samp').text();
        let id = $row.find('a').attr('href').match(/\d+/)[0];

        current[domain] = {
          id,
          data: {
            severity: $row.find('[class=severity]').text().trim().toLowerCase(),
            reject: [].concat(
              $row.find('[class=reject_media] i').length ? [ 'media' ] : [],
              $row.find('[class=reject_reports] i').length ? [ 'reports' ] : [],
            ),
          },
        };
      });
    } while (page = $('.pagination .page a[rel="next"]').text());

    for (let domain in blocklist) {
      let data = blocklist[domain];
      let addForm = new FormData();
      let action = 'add';

      // skip if domain already added and has correct block settings
      if (current[domain] && !allowlist[domain] && util.isDeepStrictEqual(current[domain].data, data)) {
        continue;
      }

      // skip if domain has not been added and is on the allowlist
      if (!current[domain] && allowlist[domain]) {
        continue;
      }

      // remove domain if it has been added and is on the allowlist
      if (current[domain] && allowlist[domain]) {
        action = 'remove';
      }

      // update domain if it has been added and is not on the allowlist
      if (current[domain] && !allowlist[domain]) {
        action = 'update';
      }

      console.log(action, domain);

      // delete domain if it's being removed or updated
      if (action !== 'add') {
        response = await got(`${URLs.blocks}/${current[domain].id}`, { cookieJar });
        $ = cheerio.load(response.body);

        let deleteForm = new FormData();
        deleteForm.append('_method', 'delete');
        deleteForm.append('domain_block[retroactive]', '0');
        deleteForm.append('authenticity_token', $('[name=authenticity_token]').val());
        got.post(`${URLs.blocks}/${current[domain].id}`, { cookieJar, body: deleteForm }).catch(res => res);
      }

      // insert domain if it's being added or updated
      if (action !== 'remove') {
        response = await got(`${URLs.blocks}/new`, { cookieJar });
        $ = cheerio.load(response.body);

        addForm.append('authenticity_token', $('[name=authenticity_token]').val());
        addForm.append('domain_block[domain]', domain);
        addForm.append('domain_block[severity]', data.severity);
        addForm.append('domain_block[reject_media]', data.reject.indexOf('media') === -1 ? 0 : 1);
        addForm.append('domain_block[reject_reports]', data.reject.indexOf('reports') === -1 ? 0 : 1);
        await got.post(`${URLs.blocks}`, { cookieJar, body: addForm }).catch(res => res);
      }
    }
  }
})();
