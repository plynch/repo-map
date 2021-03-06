var m = require('mithril')

var GitHub = module.exports

GitHub.repoCommits = function (repo) {
  return request('/repos/'+ repo +'/branches', true)
    .run(function (branches) {
      const branchNames = [];

      const branchRequestStreams = branches.map(function (branch) {
        return request(`/repos/${repo}/commits?sha=${branch.name}`, true)
          .map(function (commitList) {
            return { name: branch.name, commits: commitList };
          });
      });

      return m.prop.flatSync(branchRequestStreams)
    })
}

//
// Caching (gotta go fast)
// Since we're only doing GET requests,
// we can keep it simple.
//
var streamCache = {}

function request (endpoint, cache) {
  if ( cache && localStorage.getItem(endpoint) ) {
    return m.prop( JSON.parse( localStorage.getItem(endpoint) ) )
  }

  return m.request({
    method: 'GET',
    url: 'https://api.github.com' + endpoint,
    config: function (xhr) {
      if ( App.token ) xhr.setRequestHeader('Authorization', `token ${App.token}`)
    }
  })
    .map(function (result) {
      if ( cache ) localStorage.setItem( endpoint, JSON.stringify(result) )
      return result
    })
}
