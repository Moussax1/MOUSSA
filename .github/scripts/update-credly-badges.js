const https = require('https');
const fs = require('fs');
const path = require('path');

const CREDLY_USER = 'mohamed-yassine-ben-moussa';
const README_PATH = path.join(__dirname, '..', '..', 'README.md');
const START_MARKER = '<!-- CREDLY_BADGES_START -->';
const END_MARKER = '<!-- CREDLY_BADGES_END -->';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function generateBadgeHTML(badges) {
  const sorted = badges.sort((a, b) =>
    new Date(b.issued_at_date) - new Date(a.issued_at_date)
  );

  const [featured, ...rest] = sorted;

  const featuredHTML = `<p align="center">
  <a href="https://www.credly.com/badges/${featured.id}" target="_blank">
    <img src="${featured.badge_template.image_url}" width="130" height="130" alt="${featured.badge_template.name}"/>
  </a>
  <br/><b>${featured.badge_template.name}</b> · <sub>${formatDate(featured.issued_at_date)}</sub>
</p>`;

  const COLUMNS = 4;
  const cells = rest.map((badge) => {
    const name = badge.badge_template.name;
    const image = badge.badge_template.image_url;
    const url = `https://www.credly.com/badges/${badge.id}`;
    return `    <td align="center" width="120">
      <a href="${url}" target="_blank">
        <img src="${image}" width="90" height="90" alt="${name}"/>
      </a>
      <br/><sub>${name}</sub>
    </td>`;
  });

  const rows = [];
  for (let i = 0; i < cells.length; i += COLUMNS) {
    rows.push(`  <tr>\n${cells.slice(i, i + COLUMNS).join('\n')}\n  </tr>`);
  }

  const tableHTML = rest.length
    ? `\n\n<table align="center">\n${rows.join('\n')}\n</table>`
    : '';

  return featuredHTML + tableHTML;
}

async function main() {
  try {
    const url = `https://www.credly.com/users/${CREDLY_USER}/badges.json`;
    const data = await fetchJSON(url);
    const badges = data.data;

    if (!badges || badges.length === 0) {
      console.log('No badges found.');
      return;
    }

    const html = generateBadgeHTML(badges);
    const readme = fs.readFileSync(README_PATH, 'utf-8');

    const startIdx = readme.indexOf(START_MARKER);
    const endIdx = readme.indexOf(END_MARKER);

    if (startIdx === -1 || endIdx === -1) {
      console.error('Markers not found in README.md. Add:');
      console.error(`  ${START_MARKER}`);
      console.error(`  ${END_MARKER}`);
      process.exit(1);
    }

    const before = readme.substring(0, startIdx + START_MARKER.length);
    const after = readme.substring(endIdx);

    const updated = `${before}\n${html}\n${after}`;
    fs.writeFileSync(README_PATH, updated, 'utf-8');

    console.log(`Updated README.md with ${badges.length} badge(s).`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
