var m = require('mithril')
var GitHub = require('../models/github')

// d3-timeline needs d3 to be globally-accessible
var d3 = require('d3')
var Timeline = require('d3-timeline')
var timeAgo = require('date-fns/distance_in_words_to_now')

var modes = {
  nineDays: {
    start: Date.now() - 1000 * 60 * 60 * 24 * 9,
    end: Date.now(),
    tickFormat: { tickTime: d3.timeDay, tickSize: 6 }
  },
  thirtyDays: {
    start: Date.now() - 1000 * 60 * 60 * 24 * 30,
    end: Date.now(),
    tickFormat: { tickTime: d3.timeDay, tickSize: 6 }
  },
  thirtyCommits: {
    start: 0,
    end: 0,
    tickFormat: { tickTime: d3.timeDay, tickSize: 6 }
  }
}

exports.oninit = function (vnode) {
  vnode.state.branches = GitHub.repoCommits(vnode.attrs.repo)
  vnode.state.branches.catch(err => console.log("branches err:", err))
  vnode.state.timeWindow = m.prop( modes.nineDays )
}

exports.view = function (vnode) {
  var activeCommit = vnode.state.activeCommit

  return m('.repo-map', [
    m('h2', vnode.attrs.repo),

    vnode.state.branches()
      ? m('.graph', { oncreate: renderGraph.papp(vnode.state) })
      : m('p', "Loading...")
    ,

    m('select', { onchange: e => vnode.state.timeWindow( modes[e.currentTarget.value] ) }, [
      m('option[value=nineDays]', "Last 9 days"),
      m('option[value=thirtyDays]', "Last 30 days"),
      m('option[value=thirtyCommits]', "Last 30 Commits"),
    ]),

    m('.commit-info', activeCommit && [
      m('h3', activeCommit.commit.message),
      m('p', `by ${activeCommit.commit.author.name}, ${timeAgo(activeCommit.starting_time)} ago.`),
    ])
  ])
}

function renderGraph (state, vnode) {
  //
  // Map data we get back from branches to a format Timeline will accept
  //
  var timelineDataStream = m.prop.combine(function (timeWindow, branches) {

    return branches().map(function (branch) {
      return {
        label: branch.name,
        times: processCommits(timeWindow().start, branch.commits)
      }
    })

  }, [ state.timeWindow, state.branches ])

  //
  // Next, create the chart
  //
  state.chart = Timeline()
    .stack(true)
    .display('circle')
    .identifyPointBy( commit => commit.sha )

    .mouseover(function (d, i, datum) {
      state.activeCommit = d
      m.redraw()
    })
    .mouseout(function () {
      state.activeCommit = undefined
    })

  //
  // Stream config values into chart
  //
  state.timeWindow.map( time =>
    console.log("Formatting")||
    state.chart
      .beginning(time.start)
      .ending(time.end)
      .tickFormat(time.tickFormat)
  )

  //
  // And finally, add chart to page,
  // auto-updating when config or data changes.
  //
  var svg = d3.select( vnode.dom ).append('svg')
    .attr('width', document.body.clientWidth)

  state.chart.init(svg)

  m.prop.combine(function (a, b) {
    console.log("Rendering")
    state.chart.render(svg, b())
  }, [state.timeWindow, timelineDataStream])
  .error( err => console.log("ERROR:", err) )
}

function processCommits (startTime, commits) {
  var commitTimes = commits
    .map(function (commit) {
      var time = new Date(commit.commit.author.date).getTime()

      // Extend data point for timeline lib
      commit.starting_time = time
      commit.ending_time = time + 1000*60*15

      return commit
    })

  return startTime > 0
    ? commitTimes.filter( time => time.starting_time > startTime )
    : commitTimes
}
