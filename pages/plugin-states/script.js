async function getReposOnPage(pageIndex) {
  const gitHubApiUrl = `https://api.github.com/orgs/logstash-plugins/repos?type=public&page=${pageIndex}`;
  const response = await fetch(gitHubApiUrl);
  return response.json();
}

async function getRepos() {
  // TODO: properly paginate
  const getReposOnPagePromises = [];
  for (pageIndex = 0; pageIndex < 10; ++pageIndex) {
    getReposOnPagePromises.push(getReposOnPage(pageIndex));
  }

  const reposList = await Promise.all(getReposOnPagePromises);
  return reposList.reduce((repos, reposOnPage) => {
    return repos.concat(reposOnPage);
  }, []);
}

async function getTravisStatusForRepo(repo) {
  const travisApiUrl = `https://api.travis-ci.org/repos/logstash-plugins/${repo}/branches/master`;
  const response = await fetch(travisApiUrl);
  return response.json();
}

async function appendStates(repos) {
  await Promise.all(repos.map(async repo => {
    const name = repo.name;
    const fullName = repo.full_name;

    repo.build_url = `https://travis-ci.org/logstash-plugins/${name}`;
    repo.build_status_badge_url = `https://travis-ci.org/logstash-plugins/${name}.svg?branch=master`;

    const travisResponse = await getTravisStatusForRepo(name);
    const branch = travisResponse.branch || {};
    const state = branch.state || 'unknown';

    repo.state = state;
  }));
  return repos;
}

function groupByStates(repos) {
  const groups = {};
  repos.forEach(repo => {
    const state = repo.state;
    if (!groups.hasOwnProperty(state)) {
      groups[state] = [];
    }

    groups[state].push(repo);
  });
  return groups;
}

function displayOnPage(stateGroups) {
  const contentEl = document.getElementById('content');
  contentEl.innerHTML = '';

  // Quick nav to state sections
  const navEl = document.createElement('nav');
  navEl.appendChild(document.createTextNode('Jump to state: '));
  Object.keys(stateGroups).forEach(state => {
    const stateLinkEl = document.createElement('a');
    stateLinkEl.setAttribute('href', `#state-${state}`);
    stateLinkEl.appendChild(document.createTextNode(state));
    navEl.appendChild(stateLinkEl);
  });
  contentEl.appendChild(navEl);

  Object.keys(stateGroups).forEach(state => {

    // State heading
    const stateHeadingEl = document.createElement('h2');
    stateHeadingEl.appendChild(document.createTextNode(state));
    stateHeadingEl.setAttribute('id', `state-${state}`);
    contentEl.appendChild(stateHeadingEl);

    // List of plugins in group
    const listEl = document.createElement('ul');
    contentEl.appendChild(listEl);
    stateGroups[state].forEach(plugin => {
      const repoLinkEl = document.createElement('a');
      repoLinkEl.setAttribute('href', plugin.html_url);
      repoLinkEl.appendChild(document.createTextNode(plugin.name));

      const badgeImageEl = document.createElement('img');
      badgeImageEl.setAttribute('src', plugin.build_status_badge_url);

      const badgeEl = document.createElement('a');
      badgeEl.setAttribute('href', plugin.build_url);
      badgeEl.appendChild(badgeImageEl);

      const itemEl = document.createElement('li');
      itemEl.appendChild(repoLinkEl);
      itemEl.appendChild(badgeEl);

      listEl.appendChild(itemEl);
    });
  });
}

function getCachedStateGroups() {
  const stateGroups = localStorage.getItem('state_groups');
  const cachedOn = localStorage.getItem('cached_on');

  if (!stateGroups || !cachedOn) {
    return undefined;
  }

  const cachedForInMs = Date.now() - new Date(cachedOn);
  if (cachedForInMs > 60 * 60 * 1000) {
    localStorage.clear();
    return undefined;
  }

  return JSON.parse(stateGroups);
}

function cacheStateGroups(stateGroups) {
  localStorage.setItem('state_groups', JSON.stringify(stateGroups));
  localStorage.setItem('cached_on', Date.now());
  return stateGroups;
}

const cachedStateGroups = getCachedStateGroups();
if (cachedStateGroups) {
  displayOnPage(cachedStateGroups);
} else {
  getRepos()
  .then(appendStates)
  .then(groupByStates)
  .then(cacheStateGroups)
  .then(displayOnPage);
}