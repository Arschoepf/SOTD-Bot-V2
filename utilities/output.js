function log(msg, tabs = 0) {

  console.log('[LOG] ' + timestamp() + ' ' + tab(tabs) + msg)

}

function logr(msg, requestId, tabs = 0) {

  console.log(`[LOG] ` + timestamp() + ` [${requestId}] ` + tab(tabs) + msg)

}

function warn(msg, tabs = 0) {

  console.log('[WRN] ' + timestamp() + ' ' + tab(tabs) + msg)

}

function error(msg, tabs = 0, err) {

  console.error('[WRN] ' + timestamp() + ' ' + tab(tabs) + msg, err)

}

function timestamp(date = new Date()) {
  const pad = (n, z = 2) => String(n).padStart(z, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

function tab(num) {
  let tabs = "";
  for (let i = 0; i < num; i++) {
    tabs += '    ';
  }
  return tabs;
}

module.exports = { log, logr, warn, error };